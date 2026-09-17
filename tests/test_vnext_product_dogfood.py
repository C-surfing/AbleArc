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
        self.assertEqual(payload["kind"], "vnext-product-dogfood")
        self.assertEqual(payload["session_id"], "001")
        self.assertEqual(payload["interpretation"], vnext_product_dogfood.INTERPRETATION)
        self.assertEqual(payload["observations"]["capture_need"], "not_observed")
        self.assertNotIn("promotion_decision", payload)
        self.assertFalse((self.root / ".learning").exists())

        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "already exists"):
            vnext_product_dogfood.start_checkpoint(self.root, self.arc.name)

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
        payload["observations"]["capture_need"] = "definitely-build-it"
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "capture_need"):
            vnext_product_dogfood.validate_checkpoint(payload)

        clean = json.loads(
            (self.arc / "product-observations" / "001.json").read_text(encoding="utf-8")
        )
        with self.assertRaisesRegex(vnext_product_dogfood.ProductDogfoodError, "arc scope"):
            vnext_product_dogfood.validate_checkpoint(clean, expected_arc_id="other-arc")

    def test_summary_reports_observations_without_promotion_verdict(self):
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
            "capture_need": "single",
            "authority_confusion": "none",
            "turn_friction": "low",
        })
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
            "capture_need": "repeated",
            "authority_confusion": "observed",
            "turn_friction": "material",
        })
        second_path.write_text(json.dumps(second, indent=2) + "\n", encoding="utf-8")

        summary = vnext_product_dogfood.summarize(self.root, self.arc.name)
        self.assertEqual(summary["session_count"], 2)
        self.assertEqual(summary["capture_need"]["single"], 1)
        self.assertEqual(summary["capture_need"]["repeated"], 1)
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
