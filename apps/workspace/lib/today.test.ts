import assert from "node:assert/strict";
import test from "node:test";
import { deriveTodayRecommendation, entryProjectTitle } from "./today.ts";
import type { WorkspaceSnapshot } from "./types";

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
    pendingStateProposalCount: 0,
    pendingMapProposalCount: 0,
    projectId: "bayes",
    projectTitle: "Bayes",
    projectStatus: "active",
    maintenanceStatus: "none",
    ...overrides,
  };
}

test("Today foregrounds an unanswered Runtime decision", () => {
  const recommendation = deriveTodayRecommendation(snapshot({
    decision: {
      id: "dec_1",
      target: "bayes",
      move: "probe",
      rationale: "Test whether the frequency model transfers to notation.",
      learnerAction: "Explain why P(A|B) differs from P(B|A).",
      uncertainty: "medium",
      representationKind: "conversation",
      representationPurpose: "Probe conditional direction.",
      evidenceCount: 1,
      expectedEvidence: "Correct explanation without a hint.",
      falsificationSignal: "Condition directions are reversed.",
      hasLearnerResponse: false,
    },
  }));

  assert.equal(recommendation.kind, "respond");
  assert.equal(recommendation.action, "Explain why P(A|B) differs from P(B|A).");
});

test("Today does not ask for duplicate evidence while assessment is pending", () => {
  const recommendation = deriveTodayRecommendation(snapshot({
    latestExchange: {
      decisionId: "dec_1",
      observationId: "obs_1",
      response: "learner response",
      status: "awaiting_assessment",
      supports: [],
      contradicts: [],
    },
  }));

  assert.equal(recommendation.kind, "await-assessment");
  assert.match(recommendation.action, /continue when/);
});

test("paused and archived Projects remain read-only from Today", () => {
  assert.equal(
    deriveTodayRecommendation(snapshot({ projectStatus: "paused" })).kind,
    "read-only",
  );
  assert.equal(
    deriveTodayRecommendation(snapshot({ projectStatus: "archived", maintenanceStatus: "due" })).kind,
    "read-only",
  );
  assert.notEqual(
    deriveTodayRecommendation(snapshot({ projectStatus: "archived", maintenanceStatus: "study_active" })).kind,
    "read-only",
  );
});

test("Entry can derive a compact Project title from the capability goal", () => {
  assert.equal(
    entryProjectTitle("Implement self-attention independently. Then debug masking errors."),
    "Implement self-attention independently",
  );
  assert.equal(entryProjectTitle("   "), "New learning arc");
});
