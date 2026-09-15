import importlib.util
import tempfile
import unittest
from pathlib import Path


def load_learning_tool():
    path = Path(__file__).resolve().parents[1] / "tools" / "learning.py"
    spec = importlib.util.spec_from_file_location("learning_tool", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


learning = load_learning_tool()


class LearningToolTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

        (self.root / "templates").mkdir()
        for name in learning.TEMPLATE_FILES:
            (self.root / "templates" / name).write_text(f"# {name}\n", encoding="utf-8")

        (self.root / "evaluation" / "arcs").mkdir(parents=True)
        for name in (
            "ARC.md",
            "SESSION.md",
            "RUNBOOK.md",
            "PRIVACY.md",
            "PROMOTION.md",
            "FAILURE-TAXONOMY.md",
        ):
            (self.root / "evaluation" / name).write_text(f"# {name}\n", encoding="utf-8")

        for filename in learning.DOMAIN_FILES.values():
            (self.root / "evaluation" / "arcs" / filename).write_text(
                f"# {filename}\n", encoding="utf-8"
            )

        (self.root / "tools").mkdir(exist_ok=True)
        (self.root / "tools" / "project_store.py").write_text("# project store\n", encoding="utf-8")
        (self.root / "tools" / "runtime.py").write_text("# runtime\n", encoding="utf-8")
        (self.root / "schemas").mkdir()
        (self.root / "schemas" / "workspace-v0.2.json").write_text("{}\n", encoding="utf-8")
        (self.root / "schemas" / "project-v0.2.json").write_text("{}\n", encoding="utf-8")
        (self.root / "schemas" / "mission-v0.2.json").write_text("{}\n", encoding="utf-8")
        (self.root / "schemas" / "runtime-v0.1.json").write_text("{}\n", encoding="utf-8")
        (self.root / "schemas" / "learning-artifact-v0.1.json").write_text("{}\n", encoding="utf-8")
        (self.root / "schemas" / "learning-artifact-v0.2.json").write_text("{}\n", encoding="utf-8")
        (self.root / "docs").mkdir()
        (self.root / "docs" / "RUNTIME-CONTRACT.md").write_text("# Runtime\n", encoding="utf-8")
        (self.root / "docs" / "LEARNING-ARTIFACTS.md").write_text("# Artifacts\n", encoding="utf-8")
        (self.root / "examples" / "learning-artifacts").mkdir(parents=True)
        (self.root / "examples" / "learning-artifacts" / "bayes-frequency-tree.json").write_text(
            "{}\n", encoding="utf-8"
        )

        (self.root / ".gitignore").write_text(
            ".learning/\n.dogfooding/\n", encoding="utf-8"
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_init_learning_is_idempotent_and_non_destructive(self):
        created = learning.init_learning(self.root)
        self.assertGreaterEqual(len(created), 4)
        self.assertTrue((self.root / ".learning" / "runtime" / "manifest.json").is_file())
        self.assertTrue((self.root / ".learning" / "runtime" / "state.json").is_file())
        self.assertTrue((self.root / ".learning" / "artifacts").is_dir())

        mission = self.root / ".learning" / "MISSION.md"
        mission.write_text("custom\n", encoding="utf-8")
        created_again = learning.init_learning(self.root)

        self.assertEqual(created_again, [])
        self.assertEqual(mission.read_text(encoding="utf-8"), "custom\n")
        self.assertTrue((self.root / ".learning" / "records").is_dir())
        self.assertTrue((self.root / ".learning" / "references").is_dir())

    def test_start_arc_scaffolds_private_evidence(self):
        arc = learning.start_arc(self.root, "probability", "Bayes Base Rate")

        self.assertTrue((arc / "ARC.md").is_file())
        self.assertTrue((arc / "BRIEF.md").is_file())
        self.assertTrue((arc / "sessions" / "001.md").is_file())
        self.assertIn("probability", (arc / "README.md").read_text(encoding="utf-8"))

    def test_start_learning_mission_saves_explicit_goal_without_model_inference(self):
        path = learning.start_learning_mission(
            self.root,
            "  Explain and apply Bayes in unfamiliar decisions.  ",
            "I use probabilistic reasoning at work.",
        )

        content = path.read_text(encoding="utf-8")
        self.assertIn("- Goal: Explain and apply Bayes in unfamiliar decisions.", content)
        self.assertIn("- Source: learner-explicit", content)
        self.assertIn("I use probabilistic reasoning at work.", content)
        self.assertIn("Start from real learner evidence", content)
        self.assertNotIn("stable", content.lower())
        self.assertTrue((self.root / ".learning" / "runtime" / "manifest.json").is_file())
        decisions = learning.learning_runtime.list_receipts(self.root, "decision")
        self.assertEqual(len(decisions), 1)
        self.assertEqual(decisions[0]["concept_ids"], ["mission-entry"])
        self.assertEqual(decisions[0]["move"], "probe")
        self.assertEqual(decisions[0]["uncertainty"], "high")
        self.assertEqual(decisions[0]["evidence_used"], [])
        response = learning.learning_runtime.record_learner_response(
            self.root,
            decisions[0]["id"],
            "I would start by comparing the claim with the study design, but I am unsure how to test confounding.",
        )
        pending = learning.learning_runtime.pending_learner_turn(self.root)
        self.assertEqual(pending["observation"]["id"], response["id"])
        self.assertEqual(
            pending["mission"]["goal"],
            "Explain and apply Bayes in unfamiliar decisions.",
        )
        self.assertEqual(
            pending["mission"]["why"],
            "I use probabilistic reasoning at work.",
        )

    def test_start_learning_mission_refuses_to_overwrite_existing_mission(self):
        learning.start_learning_mission(self.root, "Learn causal inference")

        with self.assertRaisesRegex(learning.LearningToolError, "already started"):
            learning.start_learning_mission(self.root, "Replace the goal")

    def test_start_learning_mission_validates_goal_and_context(self):
        with self.assertRaisesRegex(learning.LearningToolError, "cannot be empty"):
            learning.start_learning_mission(self.root, "  ")
        with self.assertRaisesRegex(learning.LearningToolError, "at most"):
            learning.start_learning_mission(
                self.root,
                "x" * (learning.MAX_MISSION_GOAL_LENGTH + 1),
            )

    def test_start_arc_accepts_unicode_working_name(self):
        arc = learning.start_arc(self.root, "probability", "贝叶斯直觉")
        self.assertIn("贝叶斯直觉", arc.name)

    def test_new_session_increments_without_overwrite(self):
        arc = learning.start_arc(self.root, "conceptual", "causal-model")

        second = learning.new_session(self.root, arc.name)
        third = learning.new_session(self.root, arc.name)

        self.assertEqual(second.name, "002.md")
        self.assertEqual(third.name, "003.md")
        self.assertTrue((arc / "sessions" / "001.md").is_file())

    def test_resolve_arc_rejects_paths_outside_private_workspace(self):
        outside = self.root / "outside"
        outside.mkdir()

        with self.assertRaises(learning.LearningToolError):
            learning.resolve_arc(self.root, str(outside))

    def test_doctor_checks_privacy_and_required_files(self):
        self.assertEqual(learning.doctor(self.root), [])

        (self.root / ".gitignore").write_text(".learning/\n", encoding="utf-8")
        problems = learning.doctor(self.root)
        self.assertIn(".gitignore does not protect .dogfooding/", problems)


if __name__ == "__main__":
    unittest.main()
