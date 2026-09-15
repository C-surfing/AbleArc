import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def load_project_store():
    path = REPO_ROOT / "tools" / "project_store.py"
    spec = importlib.util.spec_from_file_location("learning_project_store", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


store = load_project_store()


class ProjectStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def write_json(self, relative: str, value: dict) -> Path:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
        return path

    def create_workspace(self, project_id="transformer", mission_id="self-attention"):
        timestamp = "2026-09-15T00:00:00Z"
        self.write_json(
            ".learning/workspace.json",
            {
                "schema_version": "0.2",
                "id": "ws_local001",
                "active_project_id": project_id,
                "onboarding": {"intro_seen": False},
                "created_at": timestamp,
                "updated_at": timestamp,
            },
        )
        self.write_json(
            f".learning/projects/{project_id}/project.json",
            {
                "schema_version": "0.2",
                "id": project_id,
                "title": "Transformer from first principles",
                "status": "active",
                "active_mission_id": mission_id,
                "maintenance_status": "none",
                "created_at": timestamp,
                "updated_at": timestamp,
                "archived_at": None,
            },
        )
        self.write_json(
            f".learning/projects/{project_id}/missions/{mission_id}/mission.json",
            {
                "schema_version": "0.2",
                "id": mission_id,
                "project_id": project_id,
                "status": "active",
                "goal": "Explain, derive, implement, and debug self-attention.",
                "why": "Build an independent model rather than memorize notation.",
                "source": "learner-explicit",
                "criteria": [],
                "created_at": timestamp,
                "updated_at": timestamp,
            },
        )

    def test_detect_layout_is_read_only_and_reports_uninitialized(self):
        self.assertEqual(store.detect_layout(self.root), store.LAYOUT_UNINITIALIZED)
        self.assertFalse((self.root / ".learning").exists())
        with self.assertRaisesRegex(store.ProjectStoreError, "not initialized"):
            store.resolve_project_context(self.root)

    def test_resolves_legacy_root_layout_without_manifests(self):
        learning = self.root / ".learning"
        learning.mkdir()
        for name in ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md"):
            (learning / name).write_text(f"# {name}\n", encoding="utf-8")

        context = store.resolve_project_context(self.root)

        self.assertEqual(context.layout, store.LAYOUT_LEGACY)
        self.assertEqual(context.project_id, store.LEGACY_PROJECT_ID)
        self.assertEqual(context.mission_id, store.LEGACY_MISSION_ID)
        self.assertEqual(context.project_root, learning)
        self.assertEqual(context.mission_markdown_path, learning / "MISSION.md")
        self.assertEqual(context.roadmap_markdown_path, learning / "ROADMAP.md")
        self.assertEqual(context.runtime_root, learning / "runtime")
        self.assertIsNone(context.workspace_id)
        self.assertIsNone(context.project_manifest_path)

    def test_workspace_manifest_is_atomic_layout_switch(self):
        self.create_workspace()
        (self.root / ".learning" / "MISSION.md").write_text("legacy backup\n", encoding="utf-8")

        context = store.resolve_project_context(self.root)

        self.assertEqual(context.layout, store.LAYOUT_WORKSPACE)
        self.assertEqual(context.workspace_id, "ws_local001")
        self.assertEqual(context.project_id, "transformer")
        self.assertEqual(context.mission_id, "self-attention")
        self.assertEqual(
            context.runtime_root,
            self.root / ".learning" / "projects" / "transformer" / "runtime",
        )
        self.assertEqual(
            context.learning_map_path,
            self.root / ".learning" / "projects" / "transformer" / "map" / "current.json",
        )
        self.assertEqual(context.learner_path, self.root / ".learning" / "LEARNER.md")

    def test_explicit_project_and_mission_override_active_selection(self):
        self.create_workspace()
        self.create_workspace("rust", "ownership")
        workspace = json.loads((self.root / ".learning" / "workspace.json").read_text(encoding="utf-8"))
        workspace["active_project_id"] = "transformer"
        self.write_json(".learning/workspace.json", workspace)

        context = store.resolve_project_context(self.root, "rust", "ownership")

        self.assertEqual(context.project_id, "rust")
        self.assertEqual(context.mission_id, "ownership")

    def test_rejects_path_traversal_and_manifest_identity_mismatch(self):
        self.create_workspace()
        with self.assertRaisesRegex(store.ProjectStoreError, "project_id"):
            store.resolve_project_context(self.root, "../outside")
        with self.assertRaisesRegex(store.ProjectStoreError, "project_id"):
            store.resolve_project_context(self.root, "trailing-")

        project_path = self.root / ".learning" / "projects" / "transformer" / "project.json"
        project = json.loads(project_path.read_text(encoding="utf-8"))
        project["id"] = "different-project"
        project_path.write_text(json.dumps(project), encoding="utf-8")
        with self.assertRaisesRegex(store.ProjectStoreError, "does not match"):
            store.resolve_project_context(self.root)

    def test_rejects_invalid_completion_criterion_shape(self):
        self.create_workspace()
        mission_path = (
            self.root
            / ".learning"
            / "projects"
            / "transformer"
            / "missions"
            / "self-attention"
            / "mission.json"
        )
        mission = json.loads(mission_path.read_text(encoding="utf-8"))
        mission["criteria"] = [
            {
                "id": "explain",
                "capability": "Explain the mechanism without borrowed jargon.",
                "required": True,
                "evidence_ids": ["not-an-evidence-id"],
            }
        ]
        mission_path.write_text(json.dumps(mission), encoding="utf-8")

        with self.assertRaisesRegex(store.ProjectStoreError, "evidence_ids"):
            store.resolve_project_context(self.root)

    def test_published_manifest_schemas_share_scope_identifiers(self):
        workspace = json.loads((REPO_ROOT / "schemas" / "workspace-v0.2.json").read_text(encoding="utf-8"))
        project = json.loads((REPO_ROOT / "schemas" / "project-v0.2.json").read_text(encoding="utf-8"))
        mission = json.loads((REPO_ROOT / "schemas" / "mission-v0.2.json").read_text(encoding="utf-8"))

        self.assertEqual(workspace["properties"]["schema_version"]["const"], "0.2")
        self.assertIn("active_project_id", workspace["required"])
        self.assertEqual(project["properties"]["status"]["enum"], ["active", "paused", "archived"])
        self.assertIn("active_mission_id", project["required"])
        self.assertIn("project_id", mission["required"])
        self.assertIn("criteria", mission["required"])


if __name__ == "__main__":
    unittest.main()
