import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deriveEvidenceFreshness, readReviewPolicyContext } from "./review-policy.ts";
import type { LearningMapView } from "./types.ts";

const map: LearningMapView = {
  source: "structured",
  revision: 1,
  frontier: ["bayes"],
  nodes: [
    { id: "conditional", label: "Conditional probability", kind: "concept", state: "stable", missionRelevance: "core" },
    { id: "bayes", label: "Bayes reasoning", kind: "strategy", state: "developing", missionRelevance: "core" },
  ],
  edges: [
    { id: "conditional-bayes", source: "conditional", target: "bayes", relation: "prerequisite", confidence: "high" },
  ],
};

const state = {
  concepts: {
    conditional: { label: "Conditional probability", state: "stable" as const },
    bayes: { label: "Bayes reasoning", state: "developing" as const },
  },
};

test("freshness derives descriptive review facts without decaying mastery", () => {
  const context = deriveEvidenceFreshness(map, state, [
    {
      id: "ev_conditional",
      kind: "evidence",
      created_at: "2026-09-09T00:00:00Z",
      concept_ids: ["conditional"],
      level: "application",
      outcome: "supports",
      scaffolding: "none",
      context: "varied",
      delay: "immediate",
      independence: "independent",
    },
    {
      id: "ev_bayes",
      kind: "evidence",
      created_at: "2026-09-18T00:00:00Z",
      concept_ids: ["bayes"],
      level: "explanation",
      outcome: "supports",
      scaffolding: "light",
      context: "same",
      delay: "immediate",
      independence: "new_form",
    },
  ], new Date("2026-09-19T00:00:00Z"));

  assert.ok(context);
  const conditional = context.concepts.find((item) => item.conceptId === "conditional");
  assert.equal(conditional?.state, "stable");
  assert.equal(conditional?.daysSinceLatestSupporting, 10);
  assert.equal(conditional?.prerequisiteToFrontier, true);
  assert.equal(conditional?.hasIndependentSupporting, true);
  assert.equal(conditional?.hasDelayedSupporting, false);
  assert.equal(conditional?.hasTransferSupporting, false);
});

test("freshness distinguishes delayed and novel transfer evidence without assigning a due date", () => {
  const context = deriveEvidenceFreshness(map, state, [
    {
      id: "ev_transfer",
      kind: "evidence",
      created_at: "2026-09-10T00:00:00Z",
      concept_ids: ["conditional"],
      level: "transfer",
      outcome: "supports",
      scaffolding: "none",
      context: "novel",
      delay: "delayed",
      independence: "independent",
    },
  ], new Date("2026-09-19T00:00:00Z"));

  const conditional = context?.concepts.find((item) => item.conceptId === "conditional");
  assert.equal(conditional?.hasDelayedSupporting, true);
  assert.equal(conditional?.hasTransferSupporting, true);
  assert.equal(conditional?.latestSupporting?.level, "transfer");
  assert.equal("dueAt" in (conditional || {}), false);
});

test("contradicting evidence remains visible rather than silently demoting state", () => {
  const context = deriveEvidenceFreshness(map, state, [
    {
      id: "ev_old",
      kind: "evidence",
      created_at: "2026-09-01T00:00:00Z",
      concept_ids: ["conditional"],
      level: "application",
      outcome: "supports",
      scaffolding: "none",
      context: "varied",
      delay: "delayed",
      independence: "independent",
    },
    {
      id: "ev_new",
      kind: "evidence",
      created_at: "2026-09-19T00:00:00Z",
      concept_ids: ["conditional"],
      level: "application",
      outcome: "contradicts",
      scaffolding: "none",
      context: "varied",
      delay: "delayed",
      independence: "independent",
    },
  ], new Date("2026-09-19T00:00:00Z"));

  const conditional = context?.concepts.find((item) => item.conceptId === "conditional");
  assert.equal(conditional?.state, "stable");
  assert.equal(conditional?.supportingEvidenceCount, 1);
  assert.equal(conditional?.contradictingEvidenceCount, 1);
  assert.equal(conditional?.latestEvidenceAt, "2026-09-19T00:00:00Z");
});


test("review policy context reads existing Runtime evidence without writing learner state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-review-policy-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "review");
  const mission = path.join(project, "missions", "primary");
  const runtime = path.join(project, "runtime");
  const evidenceRoot = path.join(runtime, "receipts", "evidence");
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(mission, { recursive: true });
  fs.mkdirSync(path.join(project, "map"), { recursive: true });
  fs.mkdirSync(path.join(project, "materials"), { recursive: true });
  fs.mkdirSync(path.join(project, "artifacts"), { recursive: true });

  fs.writeFileSync(path.join(learning, "workspace.json"), JSON.stringify({
    schema_version: "0.2",
    id: "ws_review123",
    active_project_id: "review",
  }));
  fs.writeFileSync(path.join(project, "project.json"), JSON.stringify({
    schema_version: "0.2",
    id: "review",
    title: "Review",
    status: "active",
    active_mission_id: "primary",
    maintenance_status: "none",
  }));
  fs.writeFileSync(path.join(mission, "mission.json"), JSON.stringify({
    schema_version: "0.2",
    id: "primary",
    project_id: "review",
  }));
  fs.writeFileSync(path.join(mission, "MISSION.md"), "# Mission\n- Goal: Verify retention\n");
  fs.writeFileSync(path.join(learning, "LEARNER.md"), "# Learner\n");
  fs.writeFileSync(path.join(runtime, "state.json"), JSON.stringify({
    revision: 1,
    concepts: {
      conditional: {
        label: "Conditional probability",
        state: "stable",
        evidence_ids: ["ev_conditional"],
        proposal_id: "sp_example",
        decision_id: "sd_example",
      },
    },
  }));
  fs.writeFileSync(path.join(evidenceRoot, "ev_conditional.json"), JSON.stringify({
    schema_version: "0.2",
    kind: "evidence",
    id: "ev_conditional",
    created_at: "2026-09-10T00:00:00Z",
    workspace_id: "ws_review123",
    project_id: "review",
    mission_id: "primary",
    observation_id: "obs_example",
    concept_ids: ["conditional"],
    level: "explanation",
    outcome: "supports",
    failure_mode: "none",
    artifact_form: "prose",
    result_summary: "Explained independently.",
    scaffolding: "none",
    context: "varied",
    delay: "delayed",
    independence: "independent",
    supports: ["conditional direction"],
    contradicts: [],
    confidence: "high",
    assessor: "fixture",
  }));

  const before = fs.readFileSync(path.join(runtime, "state.json"), "utf8");
  const context = readReviewPolicyContext(root, new Date("2026-09-19T00:00:00Z"));
  const after = fs.readFileSync(path.join(runtime, "state.json"), "utf8");

  assert.equal(context?.concepts[0]?.conceptId, "conditional");
  assert.equal(context?.concepts[0]?.daysSinceLatestSupporting, 9);
  assert.equal(context?.concepts[0]?.hasDelayedSupporting, true);
  assert.equal(before, after);
});
