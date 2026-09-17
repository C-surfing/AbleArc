import assert from "node:assert/strict";
import test from "node:test";
import { focusScaffolds, isFocusSessionWritable } from "./focus-session.ts";
import type { WorkspaceSnapshot } from "./types.ts";

function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    agent: { configured: false, adapter: "openai-compatible" },
    source: "local",
    hasMission: true,
    mission: "Explain and apply Bayes independently.",
    learnerNote: "",
    frontier: "Bayes reasoning",
    frontierState: "developing",
    frontierReason: "Transfer is not yet independent.",
    nextMove: "Attempt a new context.",
    expectedLearnerAction: "Solve a non-medical base-rate problem without notes.",
    map: { source: "empty", frontier: [], nodes: [], edges: [] },
    evidence: [],
    misconceptions: [],
    reviewCandidates: [],
    sessions: [],
    projects: [],
    materials: [],
    projectId: "bayes",
    projectTitle: "Bayes",
    projectStatus: "active",
    maintenanceStatus: "none",
    ...overrides,
  };
}

test("Focus Session respects Project lifecycle writeability", () => {
  assert.equal(isFocusSessionWritable(snapshot({ projectStatus: "active" })), true);
  assert.equal(isFocusSessionWritable(snapshot({ projectStatus: "paused" })), false);
  assert.equal(
    isFocusSessionWritable(snapshot({ projectStatus: "archived", maintenanceStatus: "due" })),
    false,
  );
  assert.equal(
    isFocusSessionWritable(snapshot({ projectStatus: "archived", maintenanceStatus: "study_active" })),
    true,
  );
});

test("Focus scaffolds reuse Runtime decision boundaries instead of inventing an answer", () => {
  const current = snapshot({
    decision: {
      id: "dec_1",
      target: "bayes",
      move: "probe",
      rationale: "Test conditional direction.",
      learnerAction: "Explain why P(A|B) differs from P(B|A).",
      uncertainty: "medium",
      representationKind: "conversation",
      representationPurpose: "Probe direction.",
      evidenceCount: 1,
      expectedEvidence: "Independent explanation of the conditioning direction.",
      falsificationSignal: "Reverses the condition or treats the events as symmetric.",
      hasLearnerResponse: false,
    },
  });

  const scaffolds = focusScaffolds(current);
  assert.equal(scaffolds[0]?.text, current.decision?.expectedEvidence);
  assert.match(scaffolds[1]?.text || "", /Reverses the condition/);
  assert.match(scaffolds[2]?.text || "", /uncertain/);
  assert.equal(scaffolds.some((item) => item.text.includes("P(A|B) =")), false);
});
