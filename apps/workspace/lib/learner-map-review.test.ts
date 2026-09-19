import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveLearnerMapSummary,
  deriveReviewSuggestions,
} from "./learner-map-review.ts";
import type { LearningMapView, ReviewCandidate } from "./types.ts";

const map: LearningMapView = {
  source: "structured",
  frontier: ["bayes"],
  nodes: [
    { id: "conditional", label: "Conditional probability", kind: "concept", state: "stable", missionRelevance: "core" },
    { id: "base-rate", label: "Base rates", kind: "concept", state: "developing", missionRelevance: "core" },
    { id: "bayes", label: "Bayes reasoning", kind: "strategy", state: "developing", missionRelevance: "core" },
    { id: "diagnosis", label: "Diagnostic transfer", kind: "procedure", state: "unknown", missionRelevance: "core" },
  ],
  edges: [
    { id: "base-to-bayes", source: "base-rate", target: "bayes", relation: "prerequisite", confidence: "high" },
    { id: "conditional-to-bayes", source: "conditional", target: "bayes", relation: "prerequisite", confidence: "high" },
    { id: "bayes-to-diagnosis", source: "bayes", target: "diagnosis", relation: "transfer", confidence: "medium" },
  ],
};

test("learner map summary translates topology and overlay into learner-facing groups", () => {
  const summary = deriveLearnerMapSummary(map);
  assert.deepEqual(summary.frontier, ["Bayes reasoning"]);
  assert.deepEqual(summary.stable, ["Conditional probability"]);
  assert.deepEqual(summary.developing, ["Base rates", "Bayes reasoning"]);
  assert.deepEqual(summary.blockers, ["Base rates"]);
  assert.deepEqual(summary.nextDirections, ["Diagnostic transfer"]);
});

test("review suggestions are descriptive and do not invent a schedule", () => {
  const candidates: ReviewCandidate[] = [{
    concept: "Conditional probability",
    reason: "Important dependency for Bayes transfer.",
    strength: "medium",
    form: "retrieval",
  }];
  const [suggestion] = deriveReviewSuggestions(candidates, map);
  assert.equal(suggestion.concept, "Conditional probability");
  assert.match(suggestion.message, /short retrieval check/);
  assert.match(suggestion.retrievalPrompt, /Without opening notes/);
  assert.ok(!JSON.stringify(suggestion).includes("dueAt"));
  assert.ok(!JSON.stringify(suggestion).includes("interval"));
});
