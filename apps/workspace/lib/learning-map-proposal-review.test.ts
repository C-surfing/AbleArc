import assert from "node:assert/strict";
import test from "node:test";
import { parseLearningMapProposalReviews } from "./learning-map-proposal-review.ts";

function payload() {
  return {
    proposals: [
      {
        id: "mp_bayes_route",
        project_id: "bayes",
        mission_id: "mission-bayes",
        base_revision: 2,
        current_revision: 2,
        proposed_by: "teach-agent:test",
        rationale: "Evidence suggests conditional direction should be explicit.",
        evidence_count: 2,
        stale: false,
        created_at: "2026-09-17T04:00:00Z",
        changes: {
          added_nodes: ["Conditional direction"],
          removed_nodes: [],
          changed_nodes: ["Bayes reasoning"],
          added_edges: ["Conditional direction → Bayes reasoning (prerequisite, high)"],
          removed_edges: [],
          changed_edges: [],
          frontier: ["Bayes reasoning"],
        },
      },
    ],
  };
}

test("parses scoped LearningMap proposal review summaries", () => {
  const proposals = parseLearningMapProposalReviews(payload(), "bayes");
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].baseRevision, 2);
  assert.equal(proposals[0].stale, false);
  assert.deepEqual(proposals[0].changes.addedNodes, ["Conditional direction"]);
  assert.deepEqual(proposals[0].changes.frontier, ["Bayes reasoning"]);
});

test("fails closed on Project scope and stale-status drift", () => {
  assert.throws(() => parseLearningMapProposalReviews(payload(), "rust"), /Project scope/);

  const stale = payload();
  stale.proposals[0].current_revision = 3;
  assert.throws(() => parseLearningMapProposalReviews(stale, "bayes"), /stale status/);
});

test("rejects malformed human-readable change summaries", () => {
  const bad = payload();
  bad.proposals[0].changes.added_edges = [""];
  assert.throws(() => parseLearningMapProposalReviews(bad, "bayes"), /added edges/);
});
