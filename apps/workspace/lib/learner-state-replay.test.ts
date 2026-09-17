import assert from "node:assert/strict";
import test from "node:test";
import { parseLearnerStateReplay } from "./learner-state-replay.ts";

function payload() {
  return {
    project_id: "bayes",
    runtime_revision: 2,
    events: [
      {
        decision_id: "sd_second",
        proposal_id: "sp_second",
        created_at: "2026-09-17T05:20:00Z",
        concept_id: "bayes-base-rate",
        concept_label: "Bayes base-rate reasoning",
        before: "exposed",
        after: "developing",
        reason: "Independent explanation now supports developing.",
        authority: { type: "learner", id: "workspace-learner" },
        evidence_count: 1,
        policy_overridden: false,
        turn: {
          id: "turn_second",
          outcome: "completed",
          summary: "Explanation evidence was assessed and accepted.",
        },
      },
      {
        decision_id: "sd_first",
        proposal_id: "sp_first",
        created_at: "2026-09-17T05:10:00Z",
        concept_id: "bayes-base-rate",
        concept_label: "Bayes base-rate reasoning",
        before: "unknown",
        after: "exposed",
        reason: "First observed evidence justifies exposed.",
        authority: { type: "runtime_policy", id: "conservative-v0.1" },
        evidence_count: 1,
        policy_overridden: false,
        turn: null,
      },
    ],
  };
}

test("parses newest-first accepted learner-state transitions", () => {
  const replay = parseLearnerStateReplay(payload(), "bayes");
  assert.equal(replay.runtimeRevision, 2);
  assert.equal(replay.events.length, 2);
  assert.equal(replay.events[0].before, "exposed");
  assert.equal(replay.events[0].after, "developing");
  assert.equal(replay.events[0].turn?.id, "turn_second");
  assert.equal(replay.events[1].authority, "runtime_policy:conservative-v0.1");
});

test("fails closed on scope, ordering, or no-op drift", () => {
  assert.throws(() => parseLearnerStateReplay(payload(), "rust"), /Project scope/);

  const ordering = payload();
  ordering.events[1].created_at = "2026-09-17T05:30:00Z";
  assert.throws(() => parseLearnerStateReplay(ordering, "bayes"), /newest-first/);

  const noop = payload();
  noop.events[0].after = "exposed";
  assert.throws(() => parseLearnerStateReplay(noop, "bayes"), /no-op/);
});

test("rejects invalid evidence counts and malformed authority", () => {
  const evidence = payload();
  evidence.events[0].evidence_count = 0;
  assert.throws(() => parseLearnerStateReplay(evidence, "bayes"), /evidence_count/);

  const authority = payload();
  authority.events[0].authority = { type: "learner" } as unknown as { type: string; id: string };
  assert.throws(() => parseLearnerStateReplay(authority, "bayes"), /authority.id/);
});
