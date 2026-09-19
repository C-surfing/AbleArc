import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  inspectLearningKernel,
  projectLearningKernelAdvance,
} from "./learning-kernel.ts";
import type { TeachingAdvance } from "./learning-orchestrator.ts";

const advance: TeachingAdvance = {
  policy: {
    challenge: "productive",
    rationale: "Challenge is appropriate.",
    review: {
      disposition: "review_later",
      concept_ids: ["conditional"],
      rationale: "A delayed retrieval will be useful later.",
    },
    session: {
      disposition: "close",
      rationale: "The current cognitive unit is complete.",
    },
    calibration: {
      state: "aligned",
      rationale: "Explicit self-report matches observed performance.",
    },
  },
  assessment: {
    level: "explanation",
    outcome: "supports",
    failure_mode: "none",
    artifact_form: "prose",
    result_summary: "The relation was reconstructed correctly.",
    scaffolding: "none",
    context: "varied",
    delay: "delayed",
    independence: "independent",
    supports: ["conditional direction"],
    contradicts: [],
    confidence: "high",
    assessor: "fixture",
  },
  next_decision: {
    mode: "study",
    target: "Bayes transfer",
    concept_ids: ["bayes"],
    frontier_hypothesis: "Transfer remains unverified.",
    uncertainty: "medium",
    move: "transfer",
    rationale: "Change context.",
    learner_action: "Apply the same reasoning in a new setting.",
    representation: { kind: "conversation", purpose: "Test transfer." },
    expected_evidence: "Correct transfer without replay.",
    falsification_signal: "The learner reverses the condition.",
  },
};

test("Kernel advance projection exposes policy while keeping Runtime result details bounded", () => {
  const projected = projectLearningKernelAdvance(advance, {
    evidence: { id: "ev_example", internal: "not exposed" },
    next_decision: { id: "dec_next", internal: "not exposed" },
    turn: { id: "turn_internal" },
  });

  assert.deepEqual(projected, {
    policy: advance.policy,
    evidenceId: "ev_example",
    nextDecisionId: "dec_next",
  });
  assert.equal("assessment" in projected, false);
  assert.equal("turn" in projected, false);
});

test("Kernel inspection reads the existing snapshot without creating state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-kernel-inspect-"));
  const before = fs.readdirSync(root);
  const snapshot = inspectLearningKernel(root);
  const after = fs.readdirSync(root);

  assert.equal(snapshot.source, "demo");
  assert.deepEqual(after, before);
});
