import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { CompletionGateStatus } from "./completion-status.ts";
import type { PaperLearningPlan } from "./paper-learning.ts";
import type { ProjectReadContext } from "./project-store.ts";
import {
  paperCompletionConfigurationNeeded,
  readPaperLearningContext,
  writePaperLearningContext,
} from "./paper-session.ts";

function context(root: string): ProjectReadContext {
  const missionRoot = path.join(root, ".learning", "projects", "paper", "missions", "primary-mission");
  fs.mkdirSync(missionRoot, { recursive: true });
  const missionMarkdownPath = path.join(missionRoot, "MISSION.md");
  fs.writeFileSync(missionMarkdownPath, "# Mission\n", "utf8");
  return {
    layout: "workspace-v0.2",
    workspaceId: "ws_example123",
    projectId: "paper",
    projectTitle: "Paper",
    projectStatus: "active",
    maintenanceStatus: "none",
    missionId: "primary-mission",
    learnerPath: path.join(root, ".learning", "LEARNER.md"),
    missionMarkdownPath,
    learningMapPath: path.join(root, "map.json"),
    roadmapMarkdownPath: path.join(root, "ROADMAP.md"),
    statePath: path.join(root, "STATE.md"),
    runtimeRoot: path.join(root, "runtime"),
    artifactsRoot: path.join(root, "artifacts"),
    materialsRoot: path.join(root, "materials"),
  };
}

const plan: PaperLearningPlan = {
  studyMode: "understanding_first",
  sourceTitle: "Attention paper",
  researchProblem: "How can sequence positions interact without recurrence?",
  importance: "Parallel sequence modeling.",
  claims: [{ id: "main-claim", statement: "Attention can model dependencies.", sourceBasis: "Main result." }],
  method: { summary: "Attention blocks.", mechanismSteps: ["Map tokens to queries, keys, and values."] },
  evidence: [],
  limitations: ["Source-specific benchmark scope."],
  figuresEquations: [],
  prerequisites: [{
    id: "matrix-products",
    label: "Matrix products",
    whyNeeded: "Attention uses matrix products.",
    confidence: "high",
    selfReportStatus: "unknown",
  }],
  onboardingQuestions: [],
  initialPath: [{
    label: "Reconstruct the problem",
    purpose: "Anchor the paper's motivation.",
    prerequisiteIds: [],
  }],
  firstMove: {
    kind: "orient",
    target: "paper problem",
    message: "Reconstruct the problem before details.",
  },
  referencesUsed: ["paper-1"],
};

function status(ids: string[]): CompletionGateStatus {
  return {
    status: ids.length ? "collecting_evidence" : "configuration_required",
    ready: false,
    projectId: "paper",
    missionId: "primary-mission",
    requiredCount: ids.length,
    passedRequiredCount: 0,
    hasDistinctEvidence: false,
    criteria: ids.map((id) => ({
      id,
      capability: id,
      kind: "application",
      required: true,
      passed: false,
      minimumEvidence: 1,
      qualifyingEvidenceIds: [],
      citedEvidenceIds: [],
    })),
  };
}

test("paper session context persists only the structured plan under the Mission", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-paper-session-"));
  const scoped = context(root);
  const written = writePaperLearningContext(scoped, plan, "2026-09-19T00:00:00Z");
  assert.equal(written.projectId, "paper");
  assert.equal(written.plan.sourceTitle, "Attention paper");

  const read = readPaperLearningContext(scoped);
  assert.equal(read?.missionId, "primary-mission");
  assert.deepEqual(read?.plan.referencesUsed, ["paper-1"]);
  const raw = fs.readFileSync(path.join(path.dirname(scoped.missionMarkdownPath!), "paper-learning.json"), "utf8");
  assert.ok(!raw.includes("resolved source text"));
});

test("paper completion auto-configuration is conservative around custom contracts", () => {
  assert.equal(paperCompletionConfigurationNeeded(status([])), "configured");
  assert.equal(
    paperCompletionConfigurationNeeded(status([
      "reconstruct-paper-case",
      "explain-paper-method",
      "connect-claims-evidence",
      "identify-paper-boundaries",
      "delayed-paper-reconstruction",
      "transfer-paper-judgment",
    ])),
    "already_configured",
  );
  assert.equal(
    paperCompletionConfigurationNeeded(status(["custom-capability"])),
    "custom_contract_preserved",
  );
});
