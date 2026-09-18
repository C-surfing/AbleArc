import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deriveDailyRecommendation } from "./daily-recommendation.ts";
import { deriveSessionClose, relevantTomorrowSeed } from "./session-close.ts";
import { readSessionClose, sessionCloseFilePath, writeSessionClose } from "./session-close-store.ts";
import type { WorkspaceSnapshot } from "./types.ts";

function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    agent: { configured: false, adapter: "openai-compatible" },
    source: "local",
    hasMission: true,
    mission: "Implement linked-list operations independently.",
    learnerNote: "",
    frontier: "Deletion invariants",
    frontierState: "developing",
    frontierReason: "Boundary transfer is still uncertain.",
    nextMove: "Try an empty-list deletion.",
    expectedLearnerAction: "Predict and implement the empty-list case.",
    map: { source: "empty", frontier: [], nodes: [], edges: [] },
    evidence: [],
    misconceptions: [],
    reviewCandidates: [],
    sessions: [],
    projects: [],
    materials: [{
      id: "mat_delete",
      missionId: "mission-one",
      materialType: "code_artifact",
      title: "Deletion invariant",
      summary: "Reconnect both directions.",
      whyReturn: "Use before boundary transfer.",
      conceptIds: ["linked-list-delete"],
      evidenceIds: ["ev_current"],
      evidenceCount: 1,
      sourceCount: 0,
      createdAt: "2026-09-18T11:00:00Z",
    }],
    projectId: "project-one",
    projectTitle: "Linked lists",
    missionId: "mission-one",
    projectStatus: "active",
    maintenanceStatus: "none",
    pendingStateProposalCount: 1,
    pendingMapProposalCount: 1,
    decision: {
      id: "dec_next",
      target: "Empty-list deletion",
      move: "transfer",
      rationale: "The boundary case tests whether the pointer invariant transfers.",
      learnerAction: "Predict the empty-list behavior, then implement it.",
      uncertainty: "medium",
      representationKind: "conversation",
      representationPurpose: "Test transfer.",
      evidenceCount: 1,
      expectedEvidence: "Handles the empty list without corrupting links.",
      falsificationSignal: "Assumes a middle node exists.",
      hasLearnerResponse: false,
    },
    latestExchange: {
      decisionId: "dec_previous",
      observationId: "obs_current",
      evidenceId: "ev_current",
      evidenceCreatedAt: "2026-09-18T11:00:00Z",
      response: "Both neighboring links need to be updated.",
      status: "assessed",
      feedback: "The learner preserved both directions in the ordinary case.",
      outcome: "supports",
      level: "application",
      confidence: "medium",
      supports: ["deletion invariant"],
      contradicts: [],
      nextDecisionId: "dec_next",
    },
    latestStateDecision: {
      id: "sd_current",
      concept: "Doubly-linked deletion",
      before: "exposed",
      after: "developing",
      decision: "accepted",
      authority: "runtime_policy:conservative-v0.2",
      reason: "Evidence supports one-step promotion.",
      evidenceIds: ["ev_current"],
      evidenceCount: 1,
      policyOverridden: false,
    },
    ...overrides,
  };
}

function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-close-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "project-one");
  const mission = path.join(project, "missions", "mission-one");
  fs.mkdirSync(path.join(project, "runtime"), { recursive: true });
  fs.mkdirSync(mission, { recursive: true });
  fs.writeFileSync(path.join(learning, "workspace.json"), JSON.stringify({
    schema_version: "0.2",
    id: "ws_close_test",
    active_project_id: "project-one",
  }));
  fs.writeFileSync(path.join(project, "project.json"), JSON.stringify({
    schema_version: "0.2",
    id: "project-one",
    title: "Linked lists",
    status: "active",
    maintenance_status: "none",
    active_mission_id: "mission-one",
  }));
  fs.writeFileSync(path.join(mission, "mission.json"), JSON.stringify({
    schema_version: "0.2",
    id: "mission-one",
    project_id: "project-one",
  }));
  return root;
}

test("Session Close only claims capability change when the current Evidence grounded it", () => {
  const close = deriveSessionClose(snapshot());
  assert.deepEqual(close.capabilityChange, {
    concept: "Doubly-linked deletion",
    before: "exposed",
    after: "developing",
  });
  assert.deepEqual(close.materials, [{ id: "mat_delete", title: "Deletion invariant" }]);
  assert.equal(close.pendingProposalCount, 2);
  assert.equal(close.tomorrowSeed?.decisionId, "dec_next");

  const unrelated = deriveSessionClose(snapshot({
    latestStateDecision: {
      ...snapshot().latestStateDecision!,
      evidenceIds: ["ev_old"],
    },
  }));
  assert.equal(unrelated.capabilityChange, undefined);
});

test("Tomorrow Seed is ignored as soon as the Runtime Decision changes or is answered", () => {
  const current = snapshot();
  const record = {
    schemaVersion: "0.1" as const,
    revision: 1,
    workspaceId: "ws_close_test",
    projectId: "project-one",
    missionId: "mission-one",
    closedAt: "2026-09-18T11:05:00Z",
    ...deriveSessionClose(current),
  };
  assert.equal(relevantTomorrowSeed(record, current)?.decisionId, "dec_next");
  assert.equal(relevantTomorrowSeed(
    record,
    snapshot({ decision: { ...current.decision!, id: "dec_new" } }),
  ), undefined);
  assert.equal(relevantTomorrowSeed(
    record,
    snapshot({ decision: { ...current.decision!, hasLearnerResponse: true } }),
  ), undefined);
});

test("Tomorrow Seed can foreground Today without gaining learner-state authority", () => {
  const current = snapshot();
  const seed = deriveSessionClose(current).tomorrowSeed;
  const recommendation = deriveDailyRecommendation(current, undefined, seed);
  assert.equal(recommendation.primary.kind, "tomorrow-seed");
  assert.equal(recommendation.primary.action, current.decision?.learnerAction);
  assert.deepEqual(recommendation.authority, {
    createEvidence: false,
    changeMastery: false,
    reviseMap: false,
    completeMission: false,
  });
});

test("Session Close persists under Project continuity state with optimistic revision", (t) => {
  const root = makeWorkspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const draft = deriveSessionClose(snapshot());
  const first = writeSessionClose(root, draft, 0);
  assert.equal(first.revision, 1);
  assert.equal(sessionCloseFilePath(root), path.join(
    root, ".learning", "projects", "project-one", "continuity", "session-close.json",
  ));
  assert.deepEqual(readSessionClose(root), first);
  assert.throws(() => writeSessionClose(root, draft, 0), /changed before/);
  assert.equal(
    fs.readdirSync(path.join(root, ".learning", "projects", "project-one", "runtime")).length,
    0,
  );
});
