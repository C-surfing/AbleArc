import assert from "node:assert/strict";
import test from "node:test";
import { parseHostTurnInput } from "./host-turn.ts";
import {
  normalizeAssistantLearningContext,
  projectAssistantLearningState,
} from "./assistant-host.ts";
import type { WorkspaceSnapshot } from "./types.ts";

function snapshot(): WorkspaceSnapshot {
  return {
    agent: { configured: true, adapter: "openai-compatible", model: "fixture" },
    source: "local",
    hasMission: true,
    mission: "Understand an attention paper deeply.",
    learnerNote: "Private learner note that should not be copied into host state.",
    frontier: "Scaled dot-product attention",
    frontierState: "developing",
    frontierReason: "Mechanism explanation is present; transfer is still untested.",
    nextMove: "Connect the attention equation to the paper's claim.",
    expectedLearnerAction: "Explain why normalized compatibility scores act as weights.",
    map: {
      source: "structured",
      frontier: ["attention"],
      nodes: [{
        id: "attention",
        label: "Attention",
        kind: "concept",
        state: "developing",
        missionRelevance: "core",
        evidence: "ev_private_receipt",
      }],
      edges: [],
    },
    evidence: [{
      task: "Explain Q/K/V",
      level: "explanation",
      result: "Mechanism mostly reconstructed.",
      independence: "same_form",
      implication: "Transfer remains untested.",
    }],
    misconceptions: [],
    reviewCandidates: [{
      concept: "Softmax normalization",
      reason: "Needed for current mechanism.",
      strength: "medium",
      form: "retrieval",
    }],
    sessions: [],
    decision: {
      id: "dec_private_receipt",
      target: "Attention mechanism",
      move: "connect",
      rationale: "Internal rationale.",
      learnerAction: "Explain how the weights are formed.",
      uncertainty: "medium",
      representationKind: "conversation",
      representationPurpose: "Connect equation and mechanism.",
      evidenceCount: 1,
      expectedEvidence: "Mechanistic explanation.",
      falsificationSignal: "Treats values as scores.",
      hasLearnerResponse: false,
    },
    projectId: "paper-project",
    projectTitle: "Attention paper",
    missionId: "primary-mission",
    projectStatus: "active",
    maintenanceStatus: "none",
    projects: [],
    materials: [],
    pendingStateProposalCount: 0,
    pendingMapProposalCount: 0,
  };
}

test("assistant learning state is a bounded projection without Runtime receipt mechanics", () => {
  const state = projectAssistantLearningState(snapshot());
  assert.equal(state.project?.id, "paper-project");
  assert.equal(state.frontier.label, "Scaled dot-product attention");
  assert.equal(state.currentTurn?.target, "Attention mechanism");
  assert.equal(state.map.nodes[0]?.state, "developing");

  const serialized = JSON.stringify(state);
  assert.doesNotMatch(serialized, /dec_private_receipt/);
  assert.doesNotMatch(serialized, /ev_private_receipt/);
  assert.doesNotMatch(serialized, /Private learner note/);
  assert.doesNotMatch(serialized, /falsificationSignal/);
});

test("assistant context carries only the current turn and strips source excerpt bodies", () => {
  const turn = parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "chatgpt", conversationId: "conversation-1" },
    message: "Use this excerpt to explain the method.",
    projectId: "paper-project",
    missionId: "primary-mission",
    references: [{
      id: "paper-1",
      kind: "file",
      label: "Paper PDF",
      locator: "host://paper-1",
      excerpt: "SECRET SOURCE BODY",
      mediaType: "application/pdf",
    }],
    selfReport: {
      priorKnowledge: "I know matrix multiplication.",
      intent: "explain",
    },
    capabilities: ["read_attachment"],
  });

  const context = normalizeAssistantLearningContext(turn);
  assert.equal(context.persistence, "host_turn_only");
  assert.equal(context.references[0]?.resolved, true);
  assert.equal(context.selfReport?.intent, "explain");
  assert.equal(context.message, "Use this excerpt to explain the method.");
  assert.doesNotMatch(JSON.stringify(context), /SECRET SOURCE BODY/);
});
