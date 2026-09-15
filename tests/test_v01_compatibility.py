import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "runtime-v0.1" / "minimal-ledger.json"
RECEIPT_DIRECTORIES = {
    "decisions": "decision",
    "observations": "observation",
    "evidence": "evidence",
    "state-proposals": "state-proposal",
    "state-decisions": "state-decision",
    "turns": "turn",
}


def load_runtime():
    path = REPO_ROOT / "tools" / "runtime.py"
    spec = importlib.util.spec_from_file_location("learning_runtime_v01_compat", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


runtime = load_runtime()


class RuntimeV01CompatibilityTests(unittest.TestCase):
    def test_published_v01_schema_keeps_authority_and_evidence_boundaries(self):
        schema = json.loads((REPO_ROOT / "schemas" / "runtime-v0.1.json").read_text(encoding="utf-8"))
        definitions = schema["$defs"]

        self.assertEqual(
            definitions["masteryState"]["enum"],
            ["unknown", "exposed", "developing", "stable", "transferable"],
        )
        self.assertEqual(
            {item["$ref"] for item in schema["oneOf"]},
            {
                "#/$defs/decision",
                "#/$defs/observation",
                "#/$defs/evidence",
                "#/$defs/stateProposal",
                "#/$defs/stateDecision",
                "#/$defs/turn",
            },
        )
        self.assertIn("observation_id", definitions["evidence"]["allOf"][1]["required"])
        self.assertIn("evidence_ids", definitions["stateProposal"]["allOf"][1]["required"])
        authority = definitions["stateDecision"]["allOf"][1]["properties"]["authority"]
        self.assertEqual(
            authority["properties"]["type"]["enum"],
            ["learner", "human_reviewer", "runtime_policy"],
        )

    def test_unscoped_v01_root_ledger_remains_readable_and_rebuildable(self):
        fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            runtime.init_runtime(root)
            runtime_root = root / ".learning" / "runtime"
            (runtime_root / "manifest.json").write_text(
                json.dumps(fixture["manifest"], indent=2) + "\n",
                encoding="utf-8",
            )
            (runtime_root / "state.json").write_text(
                json.dumps(fixture["state"], indent=2) + "\n",
                encoding="utf-8",
            )

            for directory_name, receipts in fixture["receipts"].items():
                receipt_root = runtime_root / "receipts" / directory_name
                receipt_root.mkdir(parents=True, exist_ok=True)
                for receipt in receipts:
                    (receipt_root / f"{receipt['id']}.json").write_text(
                        json.dumps(receipt, indent=2) + "\n",
                        encoding="utf-8",
                    )

            self.assertEqual(runtime.verify_runtime(root), [])
            self.assertEqual(runtime.rebuild_state(root), fixture["state"])

            for directory_name, kind in RECEIPT_DIRECTORIES.items():
                expected = fixture["receipts"][directory_name][0]
                loaded = runtime.load_receipt(root, kind, expected["id"])
                self.assertEqual(loaded, expected)
                self.assertEqual(loaded["schema_version"], "0.1")
                self.assertNotIn("workspace_id", loaded)
                self.assertNotIn("project_id", loaded)
                self.assertNotIn("mission_id", loaded)


if __name__ == "__main__":
    unittest.main()

