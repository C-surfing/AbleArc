import assert from "node:assert/strict";
import test from "node:test";
import { parseCanonicalLearningMap } from "./learning-map-data.ts";

function canonicalMap(): Record<string, unknown> {
  return {
    schema_version: "0.1",
    kind: "learning-map",
    project_id: "bayes",
    revision: 1,
    parent_revision: 0,
    created_at: "2026-09-16T00:00:00Z",
    updated_at: "2026-09-16T00:01:00Z",
    rationale: "Evidence located conditional direction as the nearest prerequisite.",
    evidence_ids: ["ev_example1"],
    frontier: ["bayes-reasoning"],
    nodes: [
      { id: "conditional", label: "Conditional probability", kind: "concept", mission_relevance: "supporting" },
      { id: "bayes-reasoning", label: "Bayes reasoning", kind: "strategy", mission_relevance: "core" },
    ],
    edges: [
      { id: "conditional-bayes", source: "conditional", target: "bayes-reasoning", relation: "prerequisite", confidence: "high" },
    ],
    delta: {
      added_node_ids: ["conditional", "bayes-reasoning"],
      removed_node_ids: [],
      changed_node_ids: [],
      added_edge_ids: ["conditional-bayes"],
      removed_edge_ids: [],
      changed_edge_ids: [],
      frontier_changed: true,
    },
  };
}

test("canonical map reader keeps topology separate from mastery", () => {
  const view = parseCanonicalLearningMap(canonicalMap(), "bayes");
  assert.equal(view.source, "structured");
  assert.equal(view.revision, 1);
  assert.equal(view.nodes[0].state, "unknown");
  assert.deepEqual(view.frontier, ["bayes-reasoning"]);
  assert.equal(view.edges[0].relation, "prerequisite");
});

test("canonical map reader fails closed on extra mastery or invalid scope", () => {
  const withMastery = canonicalMap();
  (withMastery.nodes as Array<Record<string, unknown>>)[0].state = "stable";
  assert.throws(() => parseCanonicalLearningMap(withMastery, "bayes"), /node 1 is invalid/);
  assert.throws(() => parseCanonicalLearningMap(canonicalMap(), "rust"), /canonical LearningMap is invalid/);

  const forgedInitial = canonicalMap();
  forgedInitial.revision = 0;
  forgedInitial.parent_revision = null;
  assert.throws(() => parseCanonicalLearningMap(forgedInitial, "bayes"), /revision is invalid/);
});
