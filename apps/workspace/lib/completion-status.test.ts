import assert from "node:assert/strict";
import test from "node:test";
import { parseCompletionGateStatus } from "./completion-status.ts";

function readyStatus(): Record<string, unknown> {
  return {
    status: "ready",
    ready: true,
    project_id: "bayes",
    mission_id: "bayes-mission",
    required_count: 2,
    passed_required_count: 2,
    has_distinct_feynman_and_performance_evidence: true,
    criteria: [
      {
        id: "explain",
        capability: "Reconstruct Bayes without borrowed jargon",
        kind: "feynman",
        required: true,
        passed: true,
        minimum_evidence: 1,
        qualifying_evidence_ids: ["ev_explain1"],
        cited_evidence_ids: ["ev_explain1"],
      },
      {
        id: "perform",
        capability: "Use Bayes in an unfamiliar decision",
        kind: "transfer",
        required: true,
        passed: true,
        minimum_evidence: 1,
        qualifying_evidence_ids: ["ev_transfer1"],
        cited_evidence_ids: ["ev_transfer1"],
      },
    ],
  };
}

test("completion projection accepts a ready gate with distinct evidence", () => {
  const status = parseCompletionGateStatus(readyStatus(), "bayes");
  assert.equal(status.status, "ready");
  assert.equal(status.passedRequiredCount, 2);
  assert.equal(status.criteria[0].kind, "feynman");
  assert.equal(status.hasDistinctEvidence, true);
});

test("completion projection fails closed on scope and count drift", () => {
  assert.throws(
    () => parseCompletionGateStatus(readyStatus(), "rust"),
    /status is invalid/,
  );
  const inconsistent = readyStatus();
  inconsistent.passed_required_count = 1;
  assert.throws(
    () => parseCompletionGateStatus(inconsistent, "bayes"),
    /counts are inconsistent/,
  );

  const reusedEvidence = readyStatus();
  const criteria = reusedEvidence.criteria as Array<Record<string, unknown>>;
  criteria[1].qualifying_evidence_ids = ["ev_explain1"];
  criteria[1].cited_evidence_ids = ["ev_explain1"];
  assert.throws(
    () => parseCompletionGateStatus(reusedEvidence, "bayes"),
    /Evidence provenance is inconsistent/,
  );
});

test("configuration-required remains visibly unverified", () => {
  const status = parseCompletionGateStatus({
    status: "configuration_required",
    ready: false,
    project_id: "bayes",
    mission_id: "bayes-mission",
    reason: "completion requires a required Feynman reconstruction criterion",
    criteria: [],
  }, "bayes");
  assert.equal(status.requiredCount, 0);
  assert.equal(status.ready, false);
  assert.match(status.reason || "", /Feynman/);
});

test("completed status requires immutable provenance", () => {
  const missingProvenance = { ...readyStatus(), status: "completed" };
  assert.throws(
    () => parseCompletionGateStatus(missingProvenance, "bayes"),
    /provenance is invalid/,
  );
});
