import io
import json
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

from tools import learning, project_lifecycle, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class ProjectLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "templates").mkdir()
        for name in ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md"):
            shutil.copy2(REPO_ROOT / "templates" / name, self.root / "templates" / name)

    def tearDown(self):
        self.tmp.cleanup()

    def create(self, title="Bayes from first principles", project_id="bayes"):
        return project_lifecycle.create_project(
            self.root,
            title=title,
            goal="Explain and apply Bayes in unfamiliar decisions",
            why="Use probabilistic reasoning independently.",
            project_id=project_id,
        )

    def decision_payload(self, target="A varied Bayes problem"):
        return {
            "mode": "study",
            "target": target,
            "concept_ids": ["bayes-base-rate"],
            "frontier_hypothesis": "The learner should apply the prior in a changed context.",
            "evidence_used": [],
            "uncertainty": "medium",
            "move": "apply",
            "rationale": "A varied case tests independent use.",
            "learner_action": "Solve the case and explain the denominator.",
            "representation": {
                "kind": "conversation",
                "purpose": "Elicit an independent application.",
            },
            "expected_evidence": "The explanation includes both positive populations.",
            "falsification_signal": "The answer equates sensitivity with posterior probability.",
        }

    def test_creates_first_workspace_project_and_bootstrap_decision(self):
        result = self.create(title="贝叶斯直觉", project_id=None)

        self.assertEqual(result["status"], "created")
        self.assertRegex(result["project_id"], r"^project-[0-9a-f]{10}$")
        context = project_store.resolve_project_context(self.root)
        self.assertEqual(context.project_status, "active")
        self.assertEqual(context.maintenance_status, "none")
        self.assertEqual(context.mission_status, "active")
        self.assertEqual(context.project_id, result["project_id"])
        self.assertTrue(context.mission_markdown_path.is_file())
        self.assertTrue(context.roadmap_markdown_path.is_file())
        self.assertTrue(context.state_path.is_file())
        self.assertTrue(context.learner_path.is_file())
        decisions = runtime.list_receipts(self.root, "decision")
        self.assertEqual([item["id"] for item in decisions], [result["decision_id"]])
        self.assertEqual(decisions[0]["schema_version"], "0.2")
        self.assertEqual(decisions[0]["project_id"], result["project_id"])
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_multiple_projects_preserve_learner_profile_and_isolate_runtime(self):
        first = self.create()
        learner = self.root / ".learning" / "LEARNER.md"
        learner.write_text("# Learner\n\nMechanism first.\n", encoding="utf-8")
        second = project_lifecycle.create_project(
            self.root,
            title="Rust ownership",
            goal="Implement and debug ownership-sensitive Rust programs",
            project_id="rust",
            mission_id="ownership",
        )

        projects = project_lifecycle.list_projects(self.root)
        self.assertEqual({item["id"] for item in projects}, {"bayes", "rust"})
        self.assertEqual([item["id"] for item in projects if item["selected"]], ["rust"])
        self.assertEqual(learner.read_text(encoding="utf-8"), "# Learner\n\nMechanism first.\n")
        self.assertEqual(
            [item["id"] for item in runtime.list_receipts(self.root, "decision")],
            [second["decision_id"]],
        )

        project_lifecycle.switch_project(self.root, first["project_id"])
        self.assertEqual(
            [item["id"] for item in runtime.list_receipts(self.root, "decision")],
            [first["decision_id"]],
        )

    def test_paused_project_is_read_only_until_resumed(self):
        self.create()

        paused = project_lifecycle.pause_project(self.root, "bayes")
        self.assertEqual(paused["status"], "paused")
        with self.assertRaisesRegex(runtime.RuntimeContractError, "paused Project is read-only"):
            runtime.record_decision(self.root, self.decision_payload())

        resumed = project_lifecycle.resume_project(self.root, "bayes")
        self.assertEqual(resumed["status"], "active")
        decision = runtime.record_decision(self.root, self.decision_payload())
        self.assertEqual(decision["project_id"], "bayes")

    def test_archive_is_read_only_but_maintenance_can_append_evidence_chain(self):
        self.create()
        context = project_store.resolve_project_context(self.root)
        project_root = context.project_root

        archived = project_lifecycle.archive_project(self.root, "bayes")
        self.assertEqual(archived["status"], "archived")
        self.assertEqual(archived["maintenance_status"], "scheduled")
        self.assertTrue(project_root.is_dir())
        self.assertTrue(context.mission_markdown_path.is_file())
        with self.assertRaisesRegex(runtime.RuntimeContractError, "outside an active maintenance"):
            runtime.record_decision(self.root, self.decision_payload())
        with self.assertRaisesRegex(
            project_lifecycle.ProjectLifecycleError,
            "maintenance-start",
        ):
            project_lifecycle.switch_project(self.root, "bayes")

        due = project_lifecycle.maintenance_due(self.root, "bayes")
        self.assertEqual(due["maintenance_status"], "due")
        started = project_lifecycle.maintenance_start(self.root, "bayes")
        self.assertEqual(started["maintenance_status"], "study_active")
        maintenance_decision = runtime.record_decision(
            self.root,
            self.decision_payload("Two-minute delayed Bayes retrieval"),
        )
        self.assertEqual(maintenance_decision["project_id"], "bayes")

        finished = project_lifecycle.maintenance_finish(
            self.root,
            "bayes",
            "retention_confirmed",
        )
        self.assertEqual(finished["maintenance_status"], "scheduled")
        self.assertEqual(project_store.resolve_project_context(self.root).project_status, "archived")
        with self.assertRaisesRegex(runtime.RuntimeContractError, "outside an active maintenance"):
            runtime.record_decision(self.root, self.decision_payload())
        self.assertTrue(project_root.is_dir())

    def test_failed_maintenance_returns_to_due_without_unarchiving(self):
        self.create()
        project_lifecycle.archive_project(self.root, "bayes")
        project_lifecycle.maintenance_start(self.root, "bayes")

        result = project_lifecycle.maintenance_finish(self.root, "bayes", "needs_study")

        self.assertEqual(result["maintenance_status"], "due")
        context = project_store.resolve_project_context(self.root)
        self.assertEqual(context.project_status, "archived")
        self.assertEqual(context.maintenance_status, "due")

    def test_active_maintenance_can_be_reselected_after_opening_another_project(self):
        self.create()
        project_lifecycle.archive_project(self.root, "bayes")
        project_lifecycle.maintenance_start(self.root, "bayes")
        project_lifecycle.create_project(
            self.root,
            title="Rust ownership",
            goal="Debug ownership errors independently",
            project_id="rust",
        )

        selected = project_lifecycle.switch_project(self.root, "bayes")

        self.assertEqual(selected["project_id"], "bayes")
        context = project_store.resolve_project_context(self.root)
        self.assertEqual(context.project_status, "archived")
        self.assertEqual(context.maintenance_status, "study_active")

    def test_learning_brief_prioritizes_pending_response_without_long_intro(self):
        empty = project_lifecycle.learning_brief(self.root)
        self.assertEqual(empty["next_action"], "create-project")
        self.create()
        decision = runtime.list_receipts(self.root, "decision")[-1]
        observation = runtime.record_learner_response(
            self.root,
            decision["id"],
            "I would compare the prior populations before conditioning.",
        )

        brief = project_lifecycle.learning_brief(self.root)

        self.assertEqual(brief["status"], "ready")
        self.assertEqual(brief["next_action"], "runtime-pending")
        self.assertEqual(brief["pending_observation_id"], observation["id"])
        self.assertIn("ready for assessment", brief["headline"])
        self.assertNotIn("ai4learning", brief["headline"].lower())

    def test_learning_brief_surfaces_runtime_to_map_topology_drift(self):
        self.create()
        decision = runtime.list_receipts(self.root, "decision")[-1]
        runtime.record_learner_response(
            self.root,
            decision["id"],
            "The prior changes the size of the candidate population.",
        )
        runtime.advance_learning_turn(
            self.root,
            decision["id"],
            {
                "assessment": {
                    "level": "explanation",
                    "outcome": "supports",
                    "failure_mode": "none",
                    "artifact_form": "prose",
                    "result_summary": "The learner used the prior as population information.",
                    "scaffolding": "light",
                    "context": "same",
                    "delay": "immediate",
                    "independence": "same_form",
                    "supports": ["base-rate reasoning"],
                    "contradicts": [],
                    "confidence": "medium",
                    "assessor": "test-suite",
                },
                "next_decision": {
                    "mode": "teach",
                    "target": "Use the base rate in a changed context",
                    "concept_ids": ["bayes-base-rate"],
                    "frontier_hypothesis": "Transfer now depends on preserving the base-rate population.",
                    "uncertainty": "medium",
                    "move": "apply",
                    "rationale": "A varied case tests whether the representation is usable.",
                    "learner_action": "Solve one changed-base-rate case.",
                    "representation": {
                        "kind": "conversation",
                        "purpose": "Test application without inventing a topology edge.",
                    },
                    "expected_evidence": "The prior remains part of the candidate population.",
                    "falsification_signal": "The prior is discarded after observing the cue.",
                },
            },
        )

        brief = project_lifecycle.learning_brief(self.root)

        self.assertTrue(brief["topology_drift"]["needs_proposal"])
        self.assertEqual(
            brief["topology_drift"]["missing_concept_ids"],
            ["bayes-base-rate"],
        )
        self.assertTrue(brief["topology_drift"]["frontier_out_of_sync"])
        self.assertEqual(
            brief["topology_action"],
            "python tools/learning_map_proposals.py --repo . derive",
        )
        self.assertEqual(brief["next_action"], "continue-current-decision")

    def test_learning_brief_surfaces_due_archived_review(self):
        self.create()
        project_lifecycle.archive_project(self.root, "bayes")
        project_lifecycle.maintenance_due(self.root, "bayes")

        brief = project_lifecycle.learning_brief(self.root)

        self.assertEqual(brief["project_status"], "archived")
        self.assertEqual(brief["due_review_count"], 1)
        self.assertEqual(brief["next_action"], "maintenance-start")

    def test_legacy_workspace_requires_explicit_migration(self):
        learning = self.root / ".learning"
        learning.mkdir()
        (learning / "MISSION.md").write_text("# Legacy\n", encoding="utf-8")

        with self.assertRaisesRegex(
            project_lifecycle.ProjectLifecycleError,
            "must be migrated",
        ):
            self.create()

    def test_creation_refuses_symlinked_learning_root(self):
        outside = self.root / "outside-learning"
        outside.mkdir()
        try:
            (self.root / ".learning").symlink_to(
                outside,
                target_is_directory=True,
            )
        except OSError as exc:
            self.skipTest(f"symbolic links are unavailable: {exc}")

        with self.assertRaisesRegex(
            project_lifecycle.ProjectLifecycleError,
            "must not be a symbolic link",
        ):
            self.create()

        self.assertEqual(list(outside.iterdir()), [])

    def test_learning_cli_creates_and_lists_projects(self):
        payload = self.root / "project.json"
        payload.write_text(
            json.dumps(
                {
                    "title": "Transformer",
                    "goal": "Implement and debug self-attention",
                    "project_id": "transformer",
                }
            ),
            encoding="utf-8",
        )
        output = io.StringIO()
        with redirect_stdout(output):
            result = learning.main(
                ["create-project", str(payload)],
                repo_root=self.root,
            )
        self.assertEqual(result, 0)
        self.assertEqual(json.loads(output.getvalue())["project_id"], "transformer")

        output = io.StringIO()
        with redirect_stdout(output):
            result = learning.main(["projects"], repo_root=self.root)
        self.assertEqual(result, 0)
        listed = json.loads(output.getvalue())["projects"]
        self.assertEqual([item["id"] for item in listed], ["transformer"])

        output = io.StringIO()
        with redirect_stdout(output):
            result = learning.main(["brief"], repo_root=self.root)
        self.assertEqual(result, 0)
        brief = json.loads(output.getvalue())
        self.assertEqual(brief["project_id"], "transformer")
        self.assertEqual(brief["next_action"], "continue-current-decision")

    def test_failed_creation_keeps_workspace_uninitialized_and_is_retryable(self):
        with mock.patch.object(
            project_lifecycle.learning_runtime,
            "verify_runtime",
            return_value=["forced verification failure"],
        ):
            with self.assertRaisesRegex(
                project_lifecycle.ProjectLifecycleError,
                "forced verification failure",
            ):
                self.create()

        learning = self.root / ".learning"
        self.assertFalse((learning / "workspace.json").exists())
        self.assertFalse((learning / "projects" / "bayes").exists())
        self.assertFalse((learning / "LEARNER.md").exists())
        self.assertEqual(
            project_store.detect_layout(self.root),
            project_store.LAYOUT_UNINITIALIZED,
        )
        failed = list((learning / "lifecycle" / "failed").glob("create_*"))
        self.assertEqual(len(failed), 1)
        self.assertTrue((failed[0] / "workspace.json").is_file())
        self.assertTrue((failed[0] / "LEARNER.md").is_file())
        self.assertTrue((failed[0] / "bayes").is_dir())

        result = self.create()
        self.assertEqual(result["status"], "created")

    def test_failed_second_project_restores_previous_selection(self):
        first = self.create()
        learner = self.root / ".learning" / "LEARNER.md"
        learner.write_text("# Learner\n\nKeep me.\n", encoding="utf-8")

        with mock.patch.object(
            project_lifecycle.learning_runtime,
            "verify_runtime",
            return_value=["forced verification failure"],
        ):
            with self.assertRaises(project_lifecycle.ProjectLifecycleError):
                project_lifecycle.create_project(
                    self.root,
                    title="Rust ownership",
                    goal="Debug ownership errors independently",
                    project_id="rust",
                )

        context = project_store.resolve_project_context(self.root)
        self.assertEqual(context.project_id, first["project_id"])
        self.assertFalse((self.root / ".learning" / "projects" / "rust").exists())
        self.assertEqual(learner.read_text(encoding="utf-8"), "# Learner\n\nKeep me.\n")


if __name__ == "__main__":
    unittest.main()
