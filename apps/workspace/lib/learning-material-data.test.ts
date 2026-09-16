import assert from "node:assert/strict";
import test from "node:test";
import { parseLearningMaterialDetail, parseLearningMaterialSummary } from "./learning-material-data.ts";

function material(): Record<string, unknown> {
  return {
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
    body_markdown: "# Full body\n\n<script>must not be projected</script>",
    concept_ids: ["bayes-reasoning"],
    evidence_ids: ["ev_example123"],
    source_refs: [],
    tags: ["bayes"],
    created_at: "2026-09-16T12:00:00Z",
  };
}

test("material projection keeps safe summary fields and omits the Markdown body", () => {
  const summary = parseLearningMaterialSummary(material(), "ws_example123", "bayes");
  assert.equal(summary.title, "Bayes as reweighting");
  assert.equal(summary.evidenceCount, 1);
  assert.equal("bodyMarkdown" in summary, false);
  assert.equal(JSON.stringify(summary).includes("script"), false);
});

test("detail parser exposes validated Markdown and provenance without rendering it", () => {
  const detail = parseLearningMaterialDetail(material(), "ws_example123", "bayes");
  assert.equal(detail.bodyMarkdown, "# Full body\n\n<script>must not be projected</script>");
  assert.deepEqual(detail.evidenceIds, ["ev_example123"]);
  assert.deepEqual(detail.tags, ["bayes"]);
});

test("material projection fails closed on scope and unsupported fields", () => {
  assert.throws(
    () => parseLearningMaterialSummary(material(), "ws_example123", "rust"),
    /identity or scope/,
  );
  const extra = { ...material(), rendered_html: "<script />" };
  assert.throws(
    () => parseLearningMaterialSummary(extra, "ws_example123", "bayes"),
    /fields are invalid/,
  );
});

test("material projection requires provenance and type-specific grounding", () => {
  assert.throws(
    () => parseLearningMaterialSummary(
      { ...material(), evidence_ids: [], source_refs: [] },
      "ws_example123",
      "bayes",
    ),
    /content or provenance/,
  );
  assert.throws(
    () => parseLearningMaterialSummary(
      { ...material(), material_type: "feynman_explanation", evidence_ids: [], source_refs: ["source"] },
      "ws_example123",
      "bayes",
    ),
    /type provenance/,
  );
});
