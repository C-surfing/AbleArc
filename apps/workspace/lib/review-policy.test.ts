import assert from "node:assert/strict";
import test from "node:test";
import { deriveEvidenceFreshness } from "./review-policy.ts";
import type { LearningMapView } from "./types.ts";

const map: LearningMapView = {
  source: "structured",
  revision: 1,
  frontier: ["bayes"],
  nodes: [
    { id: "conditional", label: "Conditional probability", kind: "concept", state: "stable", missionRelevance: "core" },
    { id: "bayes", label: "Bayes reasoning", kind: "strategy", state: "developing", missionRelevance: "core" },
  ],
  edges: [
    { id: "conditional-bayes", source: "conditional", target: "bayes", relation: "prerequisite", confidence: "high" },
  ],
};

const state = {
  concepts: {
    conditional: { label: "Conditional probability", state: "stable" as const },
    bayes: { label: "Bayes reasoning", state: "developing" as const },
  },
};

test("freshness derives descriptive review facts without decaying mastery", () => {
  const context = deriveEvidenceFreshness(map, state, [
    {
      id: "ev_conditional",
      kind: "evidence",
      created_at: "2026-09-09T00:00:00Z",
      concept_ids: ["conditional"],
      level: "application",
      outcome: "supports",
      scaffolding: "none",
      context: "varied",
      delay: "immediate",
      independence: "independent",
    },
    {
      id: "ev_bayes",
      kind: "evidence",
      created_at: "2026-09-18T00:00:00Z",
      concept_ids: ["bayes"],
      level: "explanation",
      outcome: "supports",
      scaffolding: "light",
      context: "same",
      delay: "immediate",
      independence: "new_form",
    },
  ], new Date("2026-09-19T00:00:00Z"));

  assert.ok(context);
  const conditional = context.concepts.find((item) => item.conceptId === "conditional");
  assert.equal(conditional?.state, "stable");
  assert.equal(conditional?.daysSinceLatestSupporting, 10);
  assert.equal(conditional?.prerequisiteToFrontier, true);
  assert.equal(conditional?.hasIndependentSupporting, true);
  assert.equal(conditional?.hasDelayedSupporting, false);
  assert.equal(conditional?.hasTransferSupporting, false);
});

test("freshness distinguishes delayed and novel transfer evidence without assigning a due date", () => {
  const context = deriveEvidenceFreshness(map, state, [
    {
      id: "ev_transfer",
      kind: "evidence",
      created_at: "2026-09-10T00:00:00Z",
      concept_ids: ["conditional"],
      level: "transfer",
      outcome: "supports",
      scaffolding: "none",
      context: "novel",
      delay: "delayed",
      independence: "independent",
    },
  ], new Date("2026-09-19T00:00:00Z"));

  const conditional = context?.concepts.find((item) => item.conceptId === "conditional");
  assert.equal(conditional?.hasDelayedSupporting, true);
  assert.equal(conditional?.hasTransferSupporting, true);
  assert.equal(conditional?.latestSupporting?.level, "transfer");
  assert.equal("dueAt" in (conditional || {}), false);
});

test("contradicting evidence remains visible rather than silently demoting state", () => {
  const context = deriveEvidenceFreshness(map, state, [
    {
      id: "ev_old",
      kind: "evidence",
      created_at: "2026-09-01T00:00:00Z",
      concept_ids: ["conditional"],
      level: "application",
      outcome: "supports",
      scaffolding: "none",
      context: "varied",
      delay: "delayed",
      independence: "independent",
    },
    {
      id: "ev_new",
      kind: "evidence",
      created_at: "2026-09-19T00:00:00Z",
      concept_ids: ["conditional"],
      level: "application",
      outcome: "contradicts",
      scaffolding: "none",
      context: "varied",
      delay: "delayed",
      independence: "independent",
    },
  ], new Date("2026-09-19T00:00:00Z"));

  const conditional = context?.concepts.find((item) => item.conceptId === "conditional");
  assert.equal(conditional?.state, "stable");
  assert.equal(conditional?.supportingEvidenceCount, 1);
  assert.equal(conditional?.contradictingEvidenceCount, 1);
  assert.equal(conditional?.latestEvidenceAt, "2026-09-19T00:00:00Z");
});
