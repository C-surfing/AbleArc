import assert from "node:assert/strict";
import test from "node:test";
import { filterLearningMaterials } from "./learning-material-browser.ts";
import type { LearningMaterialSummary } from "./types.ts";

function material(
  id: string,
  materialType: LearningMaterialSummary["materialType"],
  title: string,
  conceptIds: string[],
  whyReturn: string,
): LearningMaterialSummary {
  return {
    id,
    missionId: "mission-one",
    materialType,
    title,
    summary: `Summary for ${title}`,
    whyReturn,
    conceptIds,
    evidenceCount: 1,
    sourceCount: 0,
    createdAt: "2026-09-16T12:00:00Z",
  };
}

const materials = [
  material(
    "mat_bayes_note",
    "concept_note",
    "Bayes as reweighting",
    ["bayes-reasoning"],
    "Return when conditional direction feels interchangeable.",
  ),
  material(
    "mat_reference_example",
    "worked_example",
    "Reference-class screening example",
    ["base-rate"],
    "Return before a transfer attempt.",
  ),
  material(
    "mat_source",
    "source_note",
    "Primary source notes",
    ["conditional-probability"],
    "Return when checking the cited definition.",
  ),
];

test("browser filtering preserves source order when no filters are active", () => {
  assert.deepEqual(filterLearningMaterials(materials).map((item) => item.id), [
    "mat_bayes_note",
    "mat_reference_example",
    "mat_source",
  ]);
});

test("browser search matches title, return reason, concept ids, and readable type names", () => {
  assert.deepEqual(
    filterLearningMaterials(materials, { query: "screening" }).map((item) => item.id),
    ["mat_reference_example"],
  );
  assert.deepEqual(
    filterLearningMaterials(materials, { query: "conditional direction" }).map((item) => item.id),
    ["mat_bayes_note"],
  );
  assert.deepEqual(
    filterLearningMaterials(materials, { query: "conditional-probability" }).map((item) => item.id),
    ["mat_source"],
  );
  assert.deepEqual(
    filterLearningMaterials(materials, { query: "worked example" }).map((item) => item.id),
    ["mat_reference_example"],
  );
});

test("browser filters intersect type and explicit curation without changing material authority", () => {
  assert.deepEqual(
    filterLearningMaterials(materials, {
      materialType: "concept_note",
      curatedOnly: true,
      selectedMaterialIds: ["mat_bayes_note", "mat_source"],
    }).map((item) => item.id),
    ["mat_bayes_note"],
  );
  assert.deepEqual(
    filterLearningMaterials(materials, {
      curatedOnly: true,
      selectedMaterialIds: ["mat_source"],
    }).map((item) => item.id),
    ["mat_source"],
  );
});
