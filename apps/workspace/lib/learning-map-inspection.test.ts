import assert from "node:assert/strict";
import test from "node:test";
import { inspectLearningMapNode } from "./learning-map-inspection.ts";
import type { LearningMapView } from "./types.ts";

const map: LearningMapView = {
  source: "structured",
  revision: 3,
  rationale: "Evidence exposed a missing prerequisite.",
  frontier: ["bayes"],
  nodes: [
    {
      id: "conditional",
      label: "Conditional probability",
      kind: "concept",
      state: "stable",
      missionRelevance: "supporting",
      evidence: "2 accepted receipt(s)",
    },
    {
      id: "bayes",
      label: "Bayes reasoning",
      kind: "strategy",
      state: "developing",
      missionRelevance: "core",
      evidence: "1 accepted receipt(s)",
    },
    {
      id: "diagnosis",
      label: "Diagnostic reasoning",
      kind: "procedure",
      state: "unknown",
      missionRelevance: "core",
    },
  ],
  edges: [
    {
      id: "conditional-to-bayes",
      source: "conditional",
      target: "bayes",
      relation: "prerequisite",
      confidence: "high",
    },
    {
      id: "bayes-to-diagnosis",
      source: "bayes",
      target: "diagnosis",
      relation: "prepares",
      confidence: "medium",
    },
  ],
};

test("node inspection keeps topology relations separate from learner overlay", () => {
  const inspection = inspectLearningMapNode(map, "bayes");
  assert.ok(inspection);
  assert.equal(inspection.state, "developing");
  assert.equal(inspection.evidence, "1 accepted receipt(s)");
  assert.equal(inspection.frontier, true);
  assert.deepEqual(inspection.dependencies, [{
    edgeId: "conditional-to-bayes",
    nodeId: "conditional",
    label: "Conditional probability",
    relation: "prerequisite",
    confidence: "high",
  }]);
  assert.deepEqual(inspection.unlocks, [{
    edgeId: "bayes-to-diagnosis",
    nodeId: "diagnosis",
    label: "Diagnostic reasoning",
    relation: "prepares",
    confidence: "medium",
  }]);
});

test("node inspection returns undefined for a stale selection", () => {
  assert.equal(inspectLearningMapNode(map, "missing"), undefined);
});
