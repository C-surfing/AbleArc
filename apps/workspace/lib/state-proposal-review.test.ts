import assert from "node:assert/strict";
import test from "node:test";
import { parseStateProposalReviews } from "./state-proposal-review.ts";

function payload() {
  return {
    proposals: [
      {
        id: "sp_bayes_review",
        project_id: "bayes",
        mission_id: "mission-bayes",
        concept_id: "bayes-base-rate",
        concept_label: "Bayes base-rate reasoning",
        before: "developing",
        after: "stable",
        current_state: "developing",
        rationale: "Two independent signals support consolidation.",
        proposed_by: "teach-agent:test",
        evidence_count: 2,
        policy_issues: [] as string[],
        stale: false,
        created_at: "2026-09-16T12:00:00Z",
      },
    ],
  };
}

test("parses scoped pending proposal review metadata", () => {
  const reviews = parseStateProposalReviews(payload(), "bayes");
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].id, "sp_bayes_review");
  assert.equal(reviews[0].after, "stable");
  assert.equal(reviews[0].evidenceCount, 2);
});

test("rejects cross-project proposal projection", () => {
  assert.throws(() => parseStateProposalReviews(payload(), "rust"), /Project scope/);
});

test("rejects malformed policy and state fields", () => {
  const badPolicy = payload();
  badPolicy.proposals[0].policy_issues = [""];
  assert.throws(() => parseStateProposalReviews(badPolicy, "bayes"), /policy issues/);

  const badState = payload();
  badState.proposals[0].after = "mastered";
  assert.throws(() => parseStateProposalReviews(badState, "bayes"), /after is invalid/);
});
