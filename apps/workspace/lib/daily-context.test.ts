import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { normalizeDailyContextUpdate } from "./daily-context.ts";
import { dailyContextFilePath, readDailyContext, writeDailyContext } from "./daily-context-store.ts";
import { deriveDailyRecommendation, RECOMMENDATION_AUTHORITY } from "./daily-recommendation.ts";
import type { WorkspaceSnapshot } from "./types.ts";

function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-context-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "project-one");
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(learning, "workspace.json"), JSON.stringify({
    schema_version: "0.2",
    id: "ws_test_daily_context",
    active_project_id: "project-one",
  }));
  fs.writeFileSync(path.join(project, "project.json"), JSON.stringify({
    schema_version: "0.2",
    id: "project-one",
    title: "Test Project",
    status: "active",
    maintenance_status: "none",
    active_mission_id: null,
  }));
  return root;
}

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

test("DailyContext v0.1 validates a deliberately small context surface", () => {
  assert.deepEqual(normalizeDailyContextUpdate({
    expectedRevision: 0,
    energy: 4,
    availableMinutes: 45,
    focus: 5,
    note: "  Prefer a derivation today.  ",
  }), {
    expectedRevision: 0,
    energy: 4,
    availableMinutes: 45,
    focus: 5,
    note: "Prefer a derivation today.",
  });

  assert.throws(
    () => normalizeDailyContextUpdate({ expectedRevision: 0, energy: 6 }),
    /energy/,
  );
  assert.throws(
    () => normalizeDailyContextUpdate({ expectedRevision: 0, energy: 3, sleepScore: 80 }),
    /unsupported fields/,
  );
});

test("DailyContext persists outside Runtime and uses optimistic revisions", (t) => {
  const root = makeWorkspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.equal(readDailyContext(root), undefined);
  const first = writeDailyContext(root, {
    expectedRevision: 0,
    energy: 2,
    availableMinutes: 12,
  });
  assert.equal(first.revision, 1);
  assert.equal(first.energy, 2);
  assert.equal(first.availableMinutes, 12);
  assert.equal(dailyContextFilePath(root), path.join(root, ".learning", "context", "daily.json"));
  assert.equal(fs.existsSync(path.join(root, ".learning", "projects", "project-one", "runtime")), false);
  assert.deepEqual(readDailyContext(root), first);

  assert.throws(
    () => writeDailyContext(root, { expectedRevision: 0, energy: 5 }),
    /changed before/,
  );
});

test("DailyContext changes recommendation shape without learner-truth authority", () => {
  const base = snapshot();
  const low = deriveDailyRecommendation(base, {
    schemaVersion: "0.1",
    revision: 1,
    energy: 2,
    availableMinutes: 10,
    updatedAt: "2026-09-17T00:00:00.000Z",
  });
  const high = deriveDailyRecommendation(base, {
    schemaVersion: "0.1",
    revision: 2,
    energy: 5,
    availableMinutes: 60,
    focus: 5,
    updatedAt: "2026-09-17T01:00:00.000Z",
  });

  assert.equal(low.moveType, "frontier-short-retrieval");
  assert.equal(high.moveType, "frontier-deep-attempt");
  assert.notEqual(low.sessionShape, high.sessionShape);
  assert.deepEqual(low.authority, RECOMMENDATION_AUTHORITY);
  assert.deepEqual(high.authority, {
    createEvidence: false,
    changeMastery: false,
    reviseMap: false,
    completeMission: false,
  });
});

test("DailyContext never replaces an unanswered Runtime decision", () => {
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
      expectedEvidence: "Independent explanation.",
      falsificationSignal: "Reverses the condition.",
      hasLearnerResponse: false,
    },
  });
  const recommendation = deriveDailyRecommendation(current, {
    schemaVersion: "0.1",
    revision: 1,
    energy: 1,
    availableMinutes: 5,
    updatedAt: "2026-09-17T00:00:00.000Z",
  });

  assert.equal(recommendation.primary.action, "Explain why P(A|B) differs from P(B|A).");
  assert.equal(recommendation.moveType, "current-runtime-move");
  assert.match(recommendation.contextRationale || "", /Runtime decision remains/);
});
