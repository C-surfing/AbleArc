import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readMaterialCuration, setMaterialCuration } from "./material-curation-store.ts";

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai4learning-curation-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "bayes");
  const mission = path.join(project, "missions", "bayes-mission");
  writeJson(path.join(learning, "workspace.json"), {
    schema_version: "0.2",
    id: "ws_example123",
    active_project_id: "bayes",
  });
  writeJson(path.join(project, "project.json"), {
    schema_version: "0.2",
    id: "bayes",
    title: "Bayes",
    status: "active",
    active_mission_id: "bayes-mission",
    maintenance_status: "none",
  });
  writeJson(path.join(mission, "mission.json"), {
    schema_version: "0.2",
    id: "bayes-mission",
    project_id: "bayes",
  });
  const materialPath = path.join(project, "materials", "mat_bayes_note.json");
  writeJson(materialPath, {
    schema_version: "0.1",
    kind: "learning-material",
    id: "mat_bayes_note",
    workspace_id: "ws_example123",
    project_id: "bayes",
    mission_id: "bayes-mission",
    material_type: "concept_note",
    title: "Bayes as reweighting",
    summary: "A compact mechanism account.",
    why_return: "Use when conditional direction feels interchangeable.",
    body_markdown: "# Full body\n\nReference classes first.",
    concept_ids: ["bayes-reasoning"],
    evidence_ids: [],
    source_refs: ["https://example.test/bayes"],
    tags: ["bayes"],
    created_at: "2026-09-16T12:00:00Z",
  });
  return { root, project, materialPath };
}

test("material curation starts empty and persists explicit selection without changing material", () => {
  const fixture = makeRepo();
  try {
    const originalMaterial = fs.readFileSync(fixture.materialPath, "utf8");
    assert.deepEqual(readMaterialCuration(fixture.root), {
      projectId: "bayes",
      revision: 0,
      selectedMaterialIds: [],
    });

    const selected = setMaterialCuration(fixture.root, {
      expectedProjectId: "bayes",
      expectedRevision: 0,
      materialId: "mat_bayes_note",
      selected: true,
    });
    assert.equal(selected.revision, 1);
    assert.deepEqual(selected.selectedMaterialIds, ["mat_bayes_note"]);
    assert.equal(fs.readFileSync(fixture.materialPath, "utf8"), originalMaterial);
    assert.deepEqual(readMaterialCuration(fixture.root), selected);

    const idempotent = setMaterialCuration(fixture.root, {
      expectedProjectId: "bayes",
      expectedRevision: 1,
      materialId: "mat_bayes_note",
      selected: true,
    });
    assert.equal(idempotent.revision, 1);

    const removed = setMaterialCuration(fixture.root, {
      expectedProjectId: "bayes",
      expectedRevision: 1,
      materialId: "mat_bayes_note",
      selected: false,
    });
    assert.equal(removed.revision, 2);
    assert.deepEqual(removed.selectedMaterialIds, []);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("material curation rejects stale project, stale revision, and unknown material", () => {
  const fixture = makeRepo();
  try {
    assert.throws(() => setMaterialCuration(fixture.root, {
      expectedProjectId: "rust",
      expectedRevision: 0,
      materialId: "mat_bayes_note",
      selected: true,
    }), /selected Project changed/);

    setMaterialCuration(fixture.root, {
      expectedProjectId: "bayes",
      expectedRevision: 0,
      materialId: "mat_bayes_note",
      selected: true,
    });
    assert.throws(() => setMaterialCuration(fixture.root, {
      expectedProjectId: "bayes",
      expectedRevision: 0,
      materialId: "mat_bayes_note",
      selected: false,
    }), /curation changed/);
    assert.throws(() => setMaterialCuration(fixture.root, {
      expectedProjectId: "bayes",
      expectedRevision: 1,
      materialId: "mat_missing_note",
      selected: true,
    }), /not found/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("material curation remains editable for an archived selected Project because it has no learner-state authority", () => {
  const fixture = makeRepo();
  try {
    const projectPath = path.join(fixture.project, "project.json");
    const project = JSON.parse(fs.readFileSync(projectPath, "utf8")) as Record<string, unknown>;
    project.status = "archived";
    project.maintenance_status = "scheduled";
    writeJson(projectPath, project);

    const selected = setMaterialCuration(fixture.root, {
      expectedProjectId: "bayes",
      expectedRevision: 0,
      materialId: "mat_bayes_note",
      selected: true,
    });
    assert.equal(selected.revision, 1);
    assert.deepEqual(selected.selectedMaterialIds, ["mat_bayes_note"]);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
