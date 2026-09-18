import io
import json
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from tools import learning, learning_library, project_lifecycle, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class LearningLibraryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "templates").mkdir()
        for name in ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md"):
            shutil.copy2(REPO_ROOT / "templates" / name, self.root / "templates" / name)
        project_lifecycle.create_project(
            self.root,
            title="Bayes from first principles",
            goal="Explain and apply Bayes independently",
            project_id="bayes",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def payload(self, **overrides):
        value = {
            "id": "mat_bayes_note",
            "material_type": "concept_note",
            "title": "Bayes as reweighting",
            "summary": "A compact account of how prior odds and evidence combine.",
            "why_return": "Use this when conditional direction starts to feel interchangeable.",
            "body_markdown": "# Bayes as reweighting\n\nStart with the reference class.",
            "concept_ids": ["bayes-reasoning"],
            "evidence_ids": [],
            "source_refs": ["https://example.test/bayes-source"],
            "tags": ["bayes"],
        }
        value.update(overrides)
        return value

    def evidence(self):
        decision = runtime.list_receipts(self.root, "decision")[-1]
        runtime.record_learner_response(
            self.root,
            decision["id"],
            "The posterior depends on both true positives and false positives.",
        )
        result = runtime.advance_learning_turn(
            self.root,
            decision["id"],
            {
                "assessment": {
                    "level": "explanation",
                    "outcome": "supports",
                    "failure_mode": "none",
                    "artifact_form": "prose",
                    "result_summary": "The learner reconstructed the reference-class mechanism.",
                    "scaffolding": "none",
                    "context": "same",
                    "delay": "immediate",
                    "independence": "independent",
                    "supports": ["bayes mechanism"],
                    "contradicts": [],
                    "confidence": "high",
                    "assessor": "test-suite",
                },
                "next_decision": {
                    "mode": "teach",
                    "target": "Bayes transfer",
                    "concept_ids": ["bayes-reasoning"],
                    "frontier_hypothesis": "The mechanism needs a context switch.",
                    "uncertainty": "medium",
                    "move": "transfer",
                    "rationale": "Test whether the explanation survives a new representation.",
                    "learner_action": "Apply the mechanism to a screening decision.",
                    "representation": {"kind": "conversation", "purpose": "Verify transfer."},
                    "expected_evidence": "Independent conditional-direction reasoning.",
                    "falsification_signal": "The learner reverses the condition.",
                },
            },
        )
        return result["evidence"]["id"]

    def test_rejects_material_without_evidence_or_source(self):
        with self.assertRaisesRegex(learning_library.LearningLibraryError, "requires Evidence"):
            learning_library.save_material(
                self.root,
                self.payload(evidence_ids=[], source_refs=[]),
            )

    def test_saves_and_lists_source_grounded_material(self):
        saved = learning_library.save_material(self.root, self.payload())

        context = project_store.resolve_project_context(self.root)
        self.assertEqual(saved["workspace_id"], context.workspace_id)
        self.assertEqual(saved["project_id"], "bayes")
        self.assertEqual(saved["mission_id"], context.mission_id)
        self.assertEqual(learning_library.list_materials(self.root), [saved])
        self.assertTrue((context.materials_root / "mat_bayes_note.json").is_file())

    def test_evidence_grounding_is_mission_scoped(self):
        evidence_id = self.evidence()
        saved = learning_library.save_material(
            self.root,
            self.payload(source_refs=[], evidence_ids=[evidence_id]),
        )
        self.assertEqual(saved["evidence_ids"], [evidence_id])

        project_lifecycle.create_project(
            self.root,
            title="Rust ownership",
            goal="Explain and apply ownership",
            project_id="rust",
        )
        with self.assertRaisesRegex(learning_library.LearningLibraryError, "cannot use Evidence"):
            learning_library.save_material(
                self.root,
                self.payload(id="mat_rust_note", evidence_ids=[evidence_id], source_refs=[]),
            )

    def test_feynman_explanation_requires_runtime_evidence(self):
        with self.assertRaisesRegex(learning_library.LearningLibraryError, "requires Runtime Evidence"):
            learning_library.save_material(
                self.root,
                self.payload(material_type="feynman_explanation"),
            )

    def test_material_is_immutable_and_same_payload_retry_is_idempotent(self):
        first = learning_library.save_material(self.root, self.payload())
        second = learning_library.save_material(self.root, self.payload())
        self.assertEqual(second, first)

        with self.assertRaisesRegex(learning_library.LearningLibraryError, "immutable"):
            learning_library.save_material(
                self.root,
                self.payload(summary="A changed summary cannot replace a saved material."),
            )

    def test_lifecycle_blocks_archive_but_allows_active_maintenance(self):
        project_lifecycle.archive_project(self.root, "bayes")
        with self.assertRaisesRegex(learning_library.LearningLibraryError, "active Mission"):
            learning_library.save_material(self.root, self.payload())

        project_lifecycle.maintenance_start(self.root, "bayes")
        saved = learning_library.save_material(self.root, self.payload())
        self.assertEqual(saved["project_id"], "bayes")

    def test_cli_saves_and_lists_materials(self):
        payload_path = self.root / "material.json"
        payload_path.write_text(json.dumps(self.payload()), encoding="utf-8")
        output = io.StringIO()
        with redirect_stdout(output):
            self.assertEqual(learning.main(["material-save", str(payload_path)], self.root), 0)
        self.assertEqual(json.loads(output.getvalue())["id"], "mat_bayes_note")

        output = io.StringIO()
        with redirect_stdout(output):
            self.assertEqual(learning.main(["materials"], self.root), 0)
        self.assertEqual(len(json.loads(output.getvalue())["materials"]), 1)

    def test_published_schema_requires_provenance(self):
        schema = json.loads(
            (REPO_ROOT / "schemas" / "learning-material-v0.1.json").read_text(encoding="utf-8")
        )
        self.assertEqual(schema["properties"]["kind"]["const"], "learning-material")
        self.assertEqual(len(schema["anyOf"]), 2)

    def test_list_rejects_forged_timestamp_and_mission_scope(self):
        learning_library.save_material(self.root, self.payload())
        context = project_store.resolve_project_context(self.root)
        material_path = context.materials_root / "mat_bayes_note.json"
        value = json.loads(material_path.read_text(encoding="utf-8"))
        value["created_at"] = "not-a-timestamp"
        material_path.write_text(json.dumps(value), encoding="utf-8")
        with self.assertRaisesRegex(learning_library.LearningLibraryError, "ISO-8601"):
            learning_library.list_materials(self.root)

        value["created_at"] = "2026-09-16T12:00:00Z"
        value["mission_id"] = "invented-mission"
        material_path.write_text(json.dumps(value), encoding="utf-8")
        with self.assertRaisesRegex(learning_library.LearningLibraryError, "Mission manifest"):
            learning_library.list_materials(self.root)


if __name__ == "__main__":
    unittest.main()
