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

    def start(self, *, entry_mode="workspace", session_id=None):
        return vnext_product_dogfood.start_checkpoint(
            self.root,
            self.arc.name,
            entry_mode=entry_mode,
            session_id=session_id,
        )

    def test_start_creates_descriptive_checkpoint_once(self):
        path, payload = self.start()

        self.assertEqual(path, self.arc / "product-observations" / "001.json")
        self.assertEqual(payload["schema_version"], "0.3")
        self.assertEqual(payload["kind"], "vnext-product-dogfood")
        self.assertEqual(payload["session_id"], "001")
        self.assertEqual(payload["entry_mode"], "workspace")
        self.assertEqual(payload["interpretation"], vnext_product_dogfood.INTERPRETATION)
        self.assertEqual(payload["observations"]["continuity_friction"], "not_observed")
        self.assertNotIn("capture_need", payload["observations"])
        self.assertNotIn("promotion_decision", payload)
        self.assertFalse((self.root / ".learning").exists())

        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "already exists"):
            self.start()

    def test_start_can_backfill_an_existing_older_session_explicitly(self):
        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nSecond real learner session.\n",
            encoding="utf-8",
        )
        latest_path, latest = self.start()
        self.assertEqual(latest["session_id"], "002")
        self.assertEqual(latest_path.name, "002.json")

        before = vnext_product_dogfood.coverage_status(self.root, self.arc.name)
        self.assertEqual(before["missing_checkpoint_ids"], ["001"])

        backfill_path, backfill = self.start(session_id="001")
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
            self.start()

    def test_start_rejects_backfill_without_a_real_session_record(self):
        with self.assertRaisesRegex(
            vnext_product_dogfood.ProductDogfoodError,
            "session record not found: sessions/002.md",
        ):
            self.start(session_id="002")
        with self.assertRaisesRegex(
            vnext_product_dogfood.ProductDogfoodError,
            "three-digit session number",
        ):
            self.start(session_id="2")
        self.assertFalse((self.arc / "product-observations").exists())

    def test_validate_rejects_promotion_and_authority_write_fields(self):
        _, payload = self.start()
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
        _, payload = self.start()
        payload["observations"]["continuity_friction"] = "definitely-build-it"
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "continuity_friction"):
            vnext_product_dogfood.validate_checkpoint(payload)

        clean = json.loads(
            (self.arc / "product-observations" / "001.json").read_text(encoding="utf-8")
        )
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "arc scope"):
            vnext_product_dogfood.validate_checkpoint(clean, expected_arc_id="other-arc")

    def test_validate_accepts_legacy_capture_need_checkpoint(self):
        _, payload = self.start()
        payload["schema_version"] = "0.1"
        payload["interpretation"] = vnext_product_dogfood.LEGACY_INTERPRETATION
        payload.pop("entry_mode")
        payload["observations"]["capture_need"] = payload["observations"].pop("continuity_friction")

        validated = vnext_product_dogfood.validate_checkpoint(payload)
        self.assertEqual(validated["schema_version"], "0.1")
        self.assertEqual(validated["observations"]["capture_need"], "not_observed")

    def test_validate_treats_legacy_v02_checkpoint_as_workspace(self):
        _, payload = self.start()
        payload["schema_version"] = "0.2"
        payload.pop("entry_mode")

        validated = vnext_product_dogfood.validate_checkpoint(payload)
        self.assertEqual(validated["schema_version"], "0.2")
        self.assertNotIn("entry_mode", validated)

    def test_agent_checkpoint_uses_only_agent_observation_contract(self):
        _, payload = self.start(entry_mode="agent")

        self.assertEqual(payload["entry_mode"], "agent")
        self.assertEqual(
            set(payload["surface_checks"]),
            {"conversation", "learner_context", "control_trace", "runtime_turn", "verification"},
        )
        self.assertEqual(payload["observations"]["conversation_naturalness"], "not_observed")
        self.assertEqual(payload["observations"]["control_trace_alignment"], "not_observed")
        self.assertNotIn("entry_time_seconds", payload["observations"])
        self.assertNotIn("focus_chrome", payload["observations"])

        payload["surface_checks"]["entry"] = "not_observed"
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "surface_checks fields"):
            vnext_product_dogfood.validate_checkpoint(payload)

    def test_validate_rejects_entry_mode_and_contract_mismatch(self):
        _, payload = self.start(entry_mode="workspace")
        payload["entry_mode"] = "agent"

        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "surface_checks fields"):
            vnext_product_dogfood.validate_checkpoint(payload)

    def test_summary_separates_agent_and_workspace_populations(self):
        first_path, first = self.start(entry_mode="agent")
        first["observations"].update({
            "conversation_naturalness": "mechanical",
            "context_usefulness": "useful",
            "control_trace_alignment": "late",
            "verification_budget": "overused",
            "continuity_friction": "single",
            "authority_confusion": "none",
            "turn_friction": "material",
        })
        first_path.write_text(json.dumps(first, indent=2) + "\n", encoding="utf-8")

        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nWorkspace learner session.\n",
            encoding="utf-8",
        )
        second_path, second = self.start(entry_mode="workspace")
        second["observations"]["continuity_friction"] = "repeated"
        second_path.write_text(json.dumps(second, indent=2) + "\n", encoding="utf-8")

        summary = vnext_product_dogfood.summarize(self.root, self.arc.name)
        agent = summary["entry_modes"]["agent"]
        workspace = summary["entry_modes"]["workspace"]
        self.assertEqual(summary["session_count"], 2)
        self.assertEqual(agent["session_count"], 1)
        self.assertEqual(workspace["session_count"], 1)
        self.assertEqual(agent["conversation_naturalness"]["mechanical"], 1)
        self.assertEqual(agent["continuity_friction"]["single"], 1)
        self.assertEqual(workspace["continuity_friction"]["repeated"], 1)
        self.assertNotIn("conversation_naturalness", workspace)
        self.assertNotIn("focus_chrome", agent)

    def test_status_reports_missing_checkpoint_without_calling_it_a_failure(self):
        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nSecond real learner session.\n",
            encoding="utf-8",
        )
        self.start()

        status = vnext_product_dogfood.coverage_status(self.root, self.arc.name)
        self.assertEqual(status["schema_version"], "0.3")
        self.assertEqual(status["session_ids"], ["001", "002"])
        self.assertEqual(status["checkpoint_ids"], ["002"])
        self.assertEqual(status["missing_checkpoint_ids"], ["001"])
        self.assertEqual(status["orphan_checkpoint_ids"], [])
        self.assertEqual(status["interpretation"], vnext_product_dogfood.INTERPRETATION)
        self.assertNotIn("decision", status)
        self.assertNotIn("promote", status)

    def test_validate_rejects_orphan_checkpoint_but_status_can_diagnose_it(self):
        checkpoint_path, _ = self.start()
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
        first_path, first = self.start()
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
        first["schema_version"] = "0.1"
        first["interpretation"] = vnext_product_dogfood.LEGACY_INTERPRETATION
        first.pop("entry_mode")
        first["observations"]["capture_need"] = first["observations"].pop("continuity_friction")
        first_path.write_text(json.dumps(first, indent=2) + "\n", encoding="utf-8")

        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nSecond real learner session.\n",
            encoding="utf-8",
        )
        second_path, second = self.start()
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
        self.assertEqual(summary["schema_version"], "0.3")
        self.assertEqual(summary["session_count"], 2)
        workspace = summary["entry_modes"]["workspace"]
        self.assertEqual(workspace["continuity_friction"]["single"], 1)
        self.assertEqual(workspace["continuity_friction"]["repeated"], 1)
        self.assertNotIn("capture_need", summary)
        self.assertEqual(workspace["authority_confusion"]["observed"], 1)
        self.assertEqual(summary["entry_modes"]["agent"]["session_count"], 0)
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
            self.start()


if __name__ == "__main__":
    unittest.main()
