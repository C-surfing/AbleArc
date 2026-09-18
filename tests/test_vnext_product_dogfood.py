import json
import tempfile
import unittest
from pathlib import Path

from tools import vnext_product_dogfood


class VNextProductDogfoodTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.arc = self.root / ".dogfooding" / "mlp-arc"
        (self.arc / "sessions").mkdir(parents=True)
        (self.arc / "sessions" / "001.md").write_text(
            "# Session 1\n\nReal learner session.\n",
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_start_creates_descriptive_checkpoint_once(self):
        path, payload = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)

        self.assertEqual(path, self.arc / "product-observations" / "001.json")
        self.assertEqual(payload["schema_version"], "0.2")
        self.assertEqual(payload["kind"], "vnext-product-dogfood")
        self.assertEqual(payload["session_id"], "001")
        self.assertEqual(payload["interpretation"], vnext_product_dogfood.INTERPRETATION)
        self.assertEqual(payload["observations"]["continuity_friction"], "not_observed")
        self.assertNotIn("capture_need", payload["observations"])
        self.assertNotIn("promotion_decision", payload)
        self.assertFalse((self.root / ".learning").exists())

        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "already exists"):
            vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)

    def test_start_can_backfill_an_existing_older_session_explicitly(self):
        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nSecond real learner session.\n",
            encoding="utf-8",
        )
        latest_path, latest = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)
        self.assertEqual(latest["session_id"], "002")
        self.assertEqual(latest_path.name, "002.json")

        before = vnext_product_dogfood.coverage_status(self.root, self.arc.name)
        self.assertEqual(before["missing_checkpoint_ids"], ["001"])

        backfill_path, backfill = vnext_product_dogfood.start_checkpoint(
            self.root,
            self.arc.name,
            session_id="001",
        )
        self.assertEqual(backfill["session_id"], "001")
        self.assertEqual(backfill_path.name, "001.json")
        after = vnext_product_dogfood.coverage_status(self.root, self.arc.name)
        self.assertEqual(after["missing_checkpoint_ids"], [])

    def test_start_rejects_untouched_session_template(self):
        (self.root / "evaluation").mkdir()
        content = (self.arc / "sessions" / "001.md").read_text(encoding="utf-8")
        (self.root / "evaluation" / "SESSION.md").write_text(content, encoding="utf-8")

        with self.assertRaisesRegex(
            vnext_product_dogfood.ProductDogfoodError,
            "no real numbered session record",
        ):
            vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)

    def test_start_rejects_backfill_without_a_real_session_record(self):
        with self.assertRaisesRegex(
            vnext_product_dogfood.ProductDogfoodError,
            "session record not found: sessions/002.md",
        ):
            vnext_product_dogfood.start_checkpoint(
                self.root,
                self.arc.name,
                session_id="002",
            )
        with self.assertRaisesRegex(
            vnext_product_dogfood.ProductDogfoodError,
            "three-digit session number",
        ):
            vnext_product_dogfood.start_checkpoint(
                self.root,
                self.arc.name,
                session_id="2",
            )
        self.assertFalse((self.arc / "product-observations").exists())

    def test_validate_rejects_promotion_and_authority_write_fields(self):
        _, payload = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)
        payload["promotion_decision"] = "promote"
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "fields are invalid"):
            vnext_product_dogfood.validate_checkpoint(payload)

        clean = json.loads(
            (self.arc / "product-observations" / "001.json").read_text(encoding="utf-8")
        )
        clean["observations"]["runtime_write"] = True
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "decision field runtime_write"):
            vnext_product_dogfood.validate_checkpoint(clean)

    def test_validate_rejects_invalid_enum_and_scope_drift(self):
        _, payload = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)
        payload["observations"]["continuity_friction"] = "definitely-build-it"
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "continuity_friction"):
            vnext_product_dogfood.validate_checkpoint(payload)

        clean = json.loads(
            (self.arc / "product-observations" / "001.json").read_text(encoding="utf-8")
        )
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "arc scope"):
            vnext_product_dogfood.validate_checkpoint(clean, expected_arc_id="other-arc")

    def test_validate_accepts_legacy_capture_need_checkpoint(self):
        _, payload = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)
        payload["schema_version"] = vnext_product_dogfood.LEGACY_SCHEMA_VERSION
        payload["interpretation"] = vnext_product_dogfood.LEGACY_INTERPRETATION
        payload["observations"]["capture_need"] = payload["observations"].pop("continuity_friction")

        validated = vnext_product_dogfood.validate_checkpoint(payload)
        self.assertEqual(validated["schema_version"], "0.1")
        self.assertEqual(validated["observations"]["capture_need"], "not_observed")

    def test_status_reports_missing_checkpoint_without_calling_it_a_failure(self):
        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nSecond real learner session.\n",
            encoding="utf-8",
        )
        vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)

        status = vnext_product_dogfood.coverage_status(self.root, self.arc.name)
        self.assertEqual(status["schema_version"], "0.2")
        self.assertEqual(status["session_ids"], ["001", "002"])
        self.assertEqual(status["checkpoint_ids"], ["002"])
        self.assertEqual(status["missing_checkpoint_ids"], ["001"])
        self.assertEqual(status["orphan_checkpoint_ids"], [])
        self.assertEqual(status["interpretation"], vnext_product_dogfood.INTERPRETATION)
        self.assertNotIn("decision", status)
        self.assertNotIn("promote", status)

    def test_validate_rejects_orphan_checkpoint_but_status_can_diagnose_it(self):
        checkpoint_path, _ = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)
        orphan_path = checkpoint_path.with_name("002.json")
        orphan = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        orphan["session_id"] = "002"
        orphan["session_record"] = "sessions/002.md"
        orphan_path.write_text(json.dumps(orphan, indent=2) + "\n", encoding="utf-8")

        status = vnext_product_dogfood.coverage_status(self.root, self.arc.name)
        self.assertEqual(status["orphan_checkpoint_ids"], ["002"])
        with self.assertRaisesRegex(
            vnext_product_dogfood.ProductDogfoodError,
            "no matching session record: 002",
        ):
            vnext_product_dogfood.load_checkpoints(self.root, self.arc.name)

    def test_summary_normalizes_legacy_and_current_continuity_observations(self):
        first_path, first = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)
        first["surface_checks"].update({
            "entry": "pass",
            "today": "pass",
            "daily_context": "pass",
            "focus": "friction",
            "evidence_turn": "pass",
        })
        first["observations"].update({
            "entry_time_seconds": 12,
            "today_primary_action_clear": True,
            "daily_context_usefulness": "useful",
            "focus_chrome": "reduced",
            "scaffold_effect": "helpful",
            "continuity_friction": "single",
            "authority_confusion": "none",
            "turn_friction": "low",
        })
        first["schema_version"] = vnext_product_dogfood.LEGACY_SCHEMA_VERSION
        first["interpretation"] = vnext_product_dogfood.LEGACY_INTERPRETATION
        first["observations"]["capture_need"] = first["observations"].pop("continuity_friction")
        first_path.write_text(json.dumps(first, indent=2) + "\n", encoding="utf-8")

        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nSecond real learner session.\n",
            encoding="utf-8",
        )
        second_path, second = vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)
        second["observations"].update({
            "daily_context_usefulness": "mixed",
            "focus_chrome": "reduced",
            "scaffold_effect": "not_used",
            "continuity_friction": "repeated",
            "authority_confusion": "observed",
            "turn_friction": "material",
        })
        second_path.write_text(json.dumps(second, indent=2) + "\n", encoding="utf-8")

        summary = vnext_product_dogfood.summarize(self.root, self.arc.name)
        self.assertEqual(summary["schema_version"], "0.2")
        self.assertEqual(summary["session_count"], 2)
        self.assertEqual(summary["continuity_friction"]["single"], 1)
        self.assertEqual(summary["continuity_friction"]["repeated"], 1)
        self.assertNotIn("capture_need", summary)
        self.assertEqual(summary["authority_confusion"]["observed"], 1)
        self.assertEqual(summary["interpretation"], vnext_product_dogfood.INTERPRETATION)
        self.assertNotIn("decision", summary)
        self.assertNotIn("promote", summary)

    def test_rejects_symlinked_product_observation_directory(self):
        outside = self.root / "outside"
        outside.mkdir()
        try:
            (self.arc / "product-observations").symlink_to(outside, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("symbolic links are unavailable on this platform")

        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "symbolic link"):
            vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)


if __name__ == "__main__":
    unittest.main()
