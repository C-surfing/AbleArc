import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readLearningMaterialDetail } from "./learning-material-reader.ts";

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai4learning-material-reader-"));
  const projectRoot = path.join(root, ".learning", "projects", "bayes");
  writeJson(path.join(root, ".learning", "workspace.json"), {
    schema_version: "0.2",
    id: "ws_example123",
    active_project_id: "bayes",
  });
  writeJson(path.join(projectRoot, "project.json"), {
    schema_version: "0.2",
    id: "bayes",
    title: "Bayes",
    status: "active",
    active_mission_id: "bayes-mission",
    maintenance_status: "none",
  });
  writeJson(path.join(projectRoot, "missions", "bayes-mission", "mission.json"), {
    schema_version: "0.2",
    id: "bayes-mission",
    project_id: "bayes",
  });
  writeJson(path.join(projectRoot, "runtime", "receipts", "evidence", "ev_example123.json"), {
    id: "ev_example123",
    workspace_id: "ws_example123",
    project_id: "bayes",
    mission_id: "bayes-mission",
  });
  writeJson(path.join(projectRoot, "materials", "mat_bayes_note.json"), {
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
    body_markdown: "# Full body\n\n<script>plain text only</script>",
    concept_ids: ["bayes-reasoning"],
    evidence_ids: ["ev_example123"],
    source_refs: [],
    tags: ["bayes"],
    created_at: "2026-09-16T12:00:00Z",
  });
  return { root, projectRoot };
}

test("detail reader returns a fully validated selected-Project material", () => {
  const { root } = fixture();
  try {
    const material = readLearningMaterialDetail(root, "mat_bayes_note");
    assert.equal(material.title, "Bayes as reweighting");
    assert.match(material.bodyMarkdown, /plain text only/);
    assert.deepEqual(material.evidenceIds, ["ev_example123"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("detail reader rejects Evidence provenance outside the material Mission", () => {
  const { root, projectRoot } = fixture();
  try {
    writeJson(path.join(projectRoot, "runtime", "receipts", "evidence", "ev_example123.json"), {
      id: "ev_example123",
      workspace_id: "ws_example123",
      project_id: "bayes",
      mission_id: "other-mission",
    });
    assert.throws(
      () => readLearningMaterialDetail(root, "mat_bayes_note"),
      /Evidence provenance is invalid/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
