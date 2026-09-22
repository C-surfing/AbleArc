import assert from "node:assert/strict";
import test from "node:test";
import { deriveLearningObjects, learningObjectByKind } from "./learning-objects.ts";
import type { WorkspaceSnapshot } from "./types";

function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    agent: { configured: false, adapter: "openai-compatible" },
    source: "local",
    hasMission: true,
    mission: "Understand cache behavior.",
    learnerNote: "",
    frontier: "Cache miss path",
    frontierState: "developing",
    frontierReason: "The lower-level path is not stable yet.",
    nextMove: "Trace one cache miss.",
    expectedLearnerAction: "Explain the path without notes.",
    map: { source: "empty", frontier: [], nodes: [], edges: [] },
    evidence: [],
    misconceptions: [],
    reviewCandidates: [],
    sessions: [],
    projects: [],
    materials: [],
    pendingStateProposalCount: 0,
    pendingMapProposalCount: 0,
    projectId: "cuda",
    projectTitle: "CUDA",
    projectStatus: "active",
    maintenanceStatus: "none",
    decision: {
      id: "dec_1",
      target: "cache miss",
      move: "probe",
      rationale: "Expose the causal path.",
      learnerAction: "Explain the path without notes.",
      uncertainty: "medium",
      representationKind: "flow",
      representationPurpose: "Make the memory path explicit.",
      evidenceCount: 1,
      expectedEvidence: "A causal path.",
      falsificationSignal: "Treating every miss as immediate DRAM.",
      hasLearnerResponse: false,
    },
    ...overrides,
  };
}

test("lesson objects put prompt, representation, and learner attempt first", () => {
  const objects = deriveLearningObjects(snapshot());

  assert.deepEqual(
    objects.slice(0, 3).map((object) => object.kind),
    ["prompt", "diagram", "attempt"],
  );
  const prompt = learningObjectByKind(objects, "prompt");
  assert.equal(prompt?.title, "Trace one cache miss.");
  assert.equal(prompt?.learnerAction, "Explain the path without notes.");
});

test("an interactive artifact becomes the primary representation object", () => {
  const objects = deriveLearningObjects(snapshot({
    artifact: {
      id: "art_1",
      renderer: "frequency_tree_v1",
      title: "Base-rate tree",
      conceptIds: ["bayes"],
      learningGoal: "See how prevalence changes the posterior.",
      inferencePrompt: "Explain the change.",
      successEvidence: "Use both true and false positives.",
      prediction: {
        prompt: "What happens?",
        options: [{ id: "down", label: "Posterior falls" }],
      },
      payload: {
        population: 1000,
        prevalence: 0.1,
        sensitivity: 0.9,
        falsePositiveRate: 0.1,
        prevalenceMin: 0.01,
        prevalenceMax: 0.5,
        prevalenceStep: 0.01,
        labels: {
          population: "people",
          condition: "condition",
          complement: "no condition",
          positive: "positive",
          falsePositive: "false positive",
        },
      },
    },
  }));

  const interactive = learningObjectByKind(objects, "interactive");
  assert.equal(interactive?.artifactId, "art_1");
  assert.equal(interactive?.priority, "primary");
});

test("learner attempt state follows project lifecycle and saved response state", () => {
  assert.equal(
    learningObjectByKind(deriveLearningObjects(snapshot({ projectStatus: "paused" })), "attempt")?.state,
    "read_only",
  );

  assert.equal(
    learningObjectByKind(deriveLearningObjects(snapshot({
      decision: {
        ...snapshot().decision!,
        hasLearnerResponse: true,
      },
    })), "attempt")?.state,
    "submitted",
  );
});

test("feedback and learner-state consequences only appear when grounded", () => {
  const assessed = deriveLearningObjects(snapshot({
    latestExchange: {
      decisionId: "dec_1",
      observationId: "obs_1",
      response: "L1 -> L2 -> DRAM if needed.",
      status: "assessed",
      feedback: "The causal path is now explicit.",
      outcome: "supports",
      supports: ["cache-miss"],
      contradicts: [],
    },
    latestStateDecision: {
      id: "state_1",
      concept: "Cache miss path",
      before: "developing",
      after: "stable",
      decision: "accepted",
      authority: "runtime_policy:conservative",
      reason: "Independent explanation supported the transition.",
      evidenceIds: ["ev_1"],
      evidenceCount: 1,
      policyOverridden: false,
    },
  }));

  assert.equal(learningObjectByKind(assessed, "feedback")?.feedback, "The causal path is now explicit.");
  assert.equal(learningObjectByKind(assessed, "evidence_update")?.state, "accepted");

  const pending = deriveLearningObjects(snapshot({ pendingStateProposalCount: 1 }));
  assert.equal(learningObjectByKind(pending, "evidence_update")?.state, "review_required");
});

test("no lesson objects are invented before a Mission exists", () => {
  assert.deepEqual(deriveLearningObjects(snapshot({ hasMission: false, decision: undefined })), []);
});
