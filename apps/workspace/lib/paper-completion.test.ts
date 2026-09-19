import assert from "node:assert/strict";
import test from "node:test";
import type { CompletionGateStatus } from "./completion-status.ts";
import {
  PAPER_COMPLETION_CRITERION_IDS,
  createPaperCompletionCriteria,
  derivePaperCompletionProgress,
} from "./paper-completion.ts";

test("paper completion profile covers reconstruction, evidence reasoning, delayed retrieval, and transfer", () => {
  const payload = createPaperCompletionCriteria();
  assert.deepEqual(
    payload.criteria.map((criterion) => criterion.id),
    [...PAPER_COMPLETION_CRITERION_IDS],
  );
  assert.ok(payload.criteria.every((criterion) => criterion.required));
  assert.equal(
    payload.criteria.find((criterion) => criterion.id === "delayed-paper-reconstruction")?.minimum_delay,
    "delayed",
  );
  assert.equal(
    payload.criteria.find((criterion) => criterion.id === "transfer-paper-judgment")?.minimum_context,
    "novel",
  );
  assert.ok(payload.criteria.some((criterion) => criterion.kind === "feynman"));
  assert.ok(payload.criteria.some((criterion) => criterion.kind === "application"));
  assert.ok(payload.criteria.some((criterion) => criterion.kind === "transfer"));
});

test("paper completion profile links only explicit Runtime Evidence ids", () => {
  const payload = createPaperCompletionCriteria({
    "connect-claims-evidence": ["ev_claim_support_123"],
  });
  assert.deepEqual(
    payload.criteria.find((criterion) => criterion.id === "connect-claims-evidence")?.evidence_ids,
    ["ev_claim_support_123"],
  );
  assert.throws(
    () => createPaperCompletionCriteria({
      "connect-claims-evidence": ["not-evidence"],
    }),
    /invalid/,
  );
  assert.throws(
    () => createPaperCompletionCriteria({
      "unknown-criterion": ["ev_claim_support_123"],
    } as never),
    /Unknown paper completion criterion/,
  );
});

function completionStatus(passedIds: string[], ready = false): CompletionGateStatus {
  return {
    status: ready ? "ready" : "collecting_evidence",
    ready,
    projectId: "paper-project",
    missionId: "primary-mission",
    requiredCount: PAPER_COMPLETION_CRITERION_IDS.length,
    passedRequiredCount: passedIds.length,
    hasDistinctEvidence: passedIds.length > 2,
    criteria: PAPER_COMPLETION_CRITERION_IDS.map((id) => ({
      id,
      capability: id,
      kind: id === "transfer-paper-judgment"
        ? "transfer"
        : id === "delayed-paper-reconstruction"
          ? "retrieval"
          : id === "connect-claims-evidence" || id === "identify-paper-boundaries"
            ? "application"
            : "feynman",
      required: true,
      passed: passedIds.includes(id),
      minimumEvidence: 1,
      qualifyingEvidenceIds: passedIds.includes(id) ? [`ev_${id.replaceAll("-", "_")}`] : [],
      citedEvidenceIds: passedIds.includes(id) ? [`ev_${id.replaceAll("-", "_")}`] : [],
    })),
  };
}

test("paper progress does not confuse partial coverage with completion", () => {
  const partial = derivePaperCompletionProgress(completionStatus([
    "reconstruct-paper-case",
    "explain-paper-method",
    "connect-claims-evidence",
  ]));
  assert.equal(partial?.passed, 3);
  assert.equal(partial?.ready, false);
  assert.equal(partial?.delayedRetrievalPassed, false);
  assert.equal(partial?.transferPassed, false);
  assert.ok(partial?.missing.includes("delayed-paper-reconstruction"));
  assert.ok(partial?.missing.includes("transfer-paper-judgment"));
});

test("paper progress requires the full paper capability profile and Completion Gate readiness", () => {
  const all = derivePaperCompletionProgress(
    completionStatus([...PAPER_COMPLETION_CRITERION_IDS], true),
  );
  assert.equal(all?.ready, true);
  assert.equal(all?.delayedRetrievalPassed, true);
  assert.equal(all?.transferPassed, true);
  assert.deepEqual(all?.missing, []);

  const unrelated: CompletionGateStatus = {
    ...completionStatus([], false),
    criteria: [],
    requiredCount: 0,
  };
  assert.equal(derivePaperCompletionProgress(unrelated), undefined);
});
