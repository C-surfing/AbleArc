import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools import learning, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class WorkspaceMigrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "templates").mkdir()
        for name in learning.TEMPLATE_FILES:
            shutil.copy2(REPO_ROOT / "templates" / name, self.root / "templates" / name)

    def tearDown(self):
        self.tmp.cleanup()

    def create_legacy(self, goal="Explain and apply Bayes in unfamiliar decisions"):
        learning.init_learning(self.root)
        learning.start_learning_mission(
            self.root,
            goal,
            "Use probabilistic reasoning independently at work.",
        )
        learning_root = self.root / ".learning"
        (learning_root / "ROADMAP.md").write_text("# Roadmap\n\nBayes evidence\n", encoding="utf-8")
        (learning_root / "STATE.md").write_text("# State\n\nCurrent frontier\n", encoding="utf-8")
        (learning_root / "LEARNER.md").write_text("# Learner\n\nPrefers mechanism first.\n", encoding="utf-8")
        (learning_root / "records" / "checkpoint.md").write_text("evidence checkpoint\n", encoding="utf-8")
        (learning_root / "references" / "bayes.md").write_text("reference\n", encoding="utf-8")
        return learning_root

    def test_migrates_by_copy_then_atomically_activates(self):
        learning_root = self.create_legacy()
        original = {
            name: (learning_root / name).read_bytes()
            for name in ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md")
        }
        legacy_decisions = runtime.list_receipts(self.root, "decision")

        result = learning.migrate_legacy_workspace(self.root, project_id="bayes")

        self.assertEqual(result["status"], "activated")
        self.assertTrue(result["legacy_source_retained"])
        self.assertEqual(project_store.detect_layout(self.root), project_store.LAYOUT_WORKSPACE)
        context = project_store.resolve_project_context(self.root)
        self.assertEqual(context.project_id, "bayes")
        self.assertEqual(context.mission_id, "primary-mission")
        self.assertEqual(context.mission_markdown_path.read_bytes(), original["MISSION.md"])
        self.assertEqual(context.roadmap_markdown_path.read_bytes(), original["ROADMAP.md"])
        self.assertEqual(context.state_path.read_bytes(), original["STATE.md"])
        self.assertEqual(context.learner_path.read_bytes(), original["LEARNER.md"])
        for name, content in original.items():
            self.assertEqual((learning_root / name).read_bytes(), content)
        self.assertEqual(runtime.verify_runtime(self.root), [])
        self.assertEqual(runtime.list_receipts(self.root, "decision"), legacy_decisions)
        self.assertTrue((context.records_root / "checkpoint.md").is_file())
        self.assertTrue((context.references_root / "bayes.md").is_file())
        report = json.loads(
            next((learning_root / "migrations").glob("mig_*.json")).read_text(encoding="utf-8")
        )
        self.assertEqual(report["status"], "activated")
        self.assertGreater(len(report["copied_files"]), 4)
        self.assertEqual(learning.init_learning(self.root), [])
        with self.assertRaisesRegex(learning.LearningToolError, "project-aware mission lifecycle"):
            learning.start_learning_mission(self.root, "Replace the migrated Mission")

    def test_repeated_migration_is_read_only(self):
        learning_root = self.create_legacy()
        first = learning.migrate_legacy_workspace(self.root, project_id="bayes")
        workspace_before = (learning_root / "workspace.json").read_bytes()
        reports_before = sorted((learning_root / "migrations").glob("mig_*.json"))

        second = learning.migrate_legacy_workspace(self.root, project_id="different")

        self.assertEqual(second["status"], "already_activated")
        self.assertEqual(second["workspace_id"], first["workspace_id"])
        self.assertEqual(second["project_id"], "bayes")
        self.assertEqual((learning_root / "workspace.json").read_bytes(), workspace_before)
        self.assertEqual(sorted((learning_root / "migrations").glob("mig_*.json")), reports_before)

    def test_unicode_title_keeps_display_text_and_derives_portable_id(self):
        self.create_legacy("理解并迁移贝叶斯推理")

        result = learning.migrate_legacy_workspace(self.root, project_title="贝叶斯直觉")

        self.assertRegex(result["project_id"], r"^project-[0-9a-f]{10}$")
        context = project_store.resolve_project_context(self.root)
        project = json.loads(context.project_manifest_path.read_text(encoding="utf-8"))
        mission = json.loads(context.mission_manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(project["title"], "贝叶斯直觉")
        self.assertEqual(mission["goal"], "理解并迁移贝叶斯推理")

    def test_failed_verification_restores_legacy_selection_and_is_retryable(self):
        learning_root = self.create_legacy()
        original_mission = (learning_root / "MISSION.md").read_bytes()

        with self.assertRaisesRegex(learning.LearningToolError, "forced verification failure"):
            learning.migrate_legacy_workspace(
                self.root,
                project_id="bayes",
                runtime_verifier=lambda _root: ["forced verification failure"],
            )

        self.assertFalse((learning_root / "workspace.json").exists())
        self.assertEqual(project_store.detect_layout(self.root), project_store.LAYOUT_LEGACY)
        self.assertEqual((learning_root / "MISSION.md").read_bytes(), original_mission)
        failed = list((learning_root / "migrations" / "failed").glob("mig_*"))
        self.assertEqual(len(failed), 1)
        self.assertTrue((failed[0] / "workspace.json").is_file())
        self.assertTrue((failed[0] / "bayes").is_dir())
        failed_report = json.loads(
            next((learning_root / "migrations").glob("mig_*.json")).read_text(encoding="utf-8")
        )
        self.assertEqual(failed_report["status"], "failed")

        retried = learning.migrate_legacy_workspace(self.root, project_id="bayes")
        self.assertEqual(retried["status"], "activated")
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_rejects_windows_or_parent_paths_before_copying(self):
        learning_root = self.create_legacy()

        for invalid in ("../outside", r"C:\outside", "trailing-"):
            with self.subTest(project_id=invalid):
                with self.assertRaises(learning.LearningToolError):
                    learning.migrate_legacy_workspace(self.root, project_id=invalid)

        self.assertFalse((learning_root / "projects").exists())
        self.assertFalse((learning_root / "workspace.json").exists())

    def test_refuses_symlink_without_activating(self):
        learning_root = self.create_legacy()
        outside = self.root / "outside.txt"
        outside.write_text("private\n", encoding="utf-8")
        link = learning_root / "references" / "outside-link"
        try:
            link.symlink_to(outside)
        except OSError:
            self.skipTest("symbolic links are unavailable on this platform")

        with self.assertRaisesRegex(learning.LearningToolError, "symbolic link"):
            learning.migrate_legacy_workspace(self.root, project_id="bayes")

        self.assertFalse((learning_root / "workspace.json").exists())
        self.assertEqual(project_store.detect_layout(self.root), project_store.LAYOUT_LEGACY)


if __name__ == "__main__":
    unittest.main()
