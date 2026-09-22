import assert from "node:assert/strict";
import test from "node:test";
import {
  ABLEARC_MCP_TOOL_NAMES,
  recordLearnerActionInput,
  teachingAdvanceInput,
} from "./contracts.ts";

test("MCP surface stays intentionally small", () => {
  assert.deepEqual(ABLEARC_MCP_TOOL_NAMES, [
    "inspect_learning",
    "start_or_resume_learning",
    "record_learner_action",
    "commit_learning_turn",
  ]);
});

test("recording a learner action requires explicit attribution confirmation", () => {
  const rejected = recordLearnerActionInput.safeParse({
    decisionId: "dec_example123",
    response: "My reasoning is that the cache line must be fetched first.",
    confirmsResponseMatchesCurrentMove: false,
  });
  assert.equal(rejected.success, false);

  const accepted = recordLearnerActionInput.safeParse({
    decisionId: "dec_example123",
    response: "My reasoning is that the cache line must be fetched first.",
    confirmsResponseMatchesCurrentMove: true,
  });
  assert.equal(accepted.success, true);
});

test("teaching advance does not accept an assessor supplied by the model", () => {
  const value = {
    policy: {
      challenge: "productive",
      rationale: "The learner is reasoning at the target edge.",
      review: { disposition: "continue_frontier", concept_ids: [], rationale: "Stay on the current unit." },
      session: { disposition: "continue", rationale: "One more move has clear value." },
      calibration: { state: "unknown", rationale: "No explicit self-report is relevant." },
    },
    assessment: {
      level: "explanation",
      outcome: "supports",
      failure_mode: "none",
      artifact_form: "prose",
      result_summary: "The mechanism is mostly reconstructed correctly.",
      scaffolding: "none",
      context: "same",
      delay: "immediate",
      independence: "independent",
      supports: ["cache-miss-path"],
      contradicts: [],
      confidence: "medium",
      assessor: "model:forged",
    },
    next_decision: {
      mode: "teach",
      target: "cache miss path",
      concept_ids: ["cache-miss"],
      frontier_hypothesis: "The learner can trace a miss but transfer is untested.",
      uncertainty: "medium",
      move: "apply",
      rationale: "Change context without reteaching.",
      learner_action: "Trace the same mechanism for a different memory access pattern.",
      representation: { kind: "conversation", purpose: "Test application without extra cues." },
      expected_evidence: "Correct mechanism in a varied context.",
      falsification_signal: "The learner falls back to an incorrect cache model.",
    },
  };

  assert.equal(teachingAdvanceInput.safeParse(value).success, false);
});
