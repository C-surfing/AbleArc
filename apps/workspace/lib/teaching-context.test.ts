import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PaperLearningPlan } from "./paper-learning.ts";
import { writePaperLearningContext } from "./paper-session.ts";
import { resolveProjectReadContext } from "./project-store.ts";
import { readTeachingRoutingContext } from "./teaching-context.ts";

const plan: PaperLearningPlan = {
  studyMode: "follow_source",
  sourceTitle: "Paper A",
  researchProblem: "Why does the proposed method work?",
  importance: "It motivates the learning arc.",
  claims: [{ id: "claim-a", statement: "A claim.", sourceBasis: "Source section." }],
  method: { summary: "A method.", mechanismSteps: ["Step one."] },
  evidence: [],
  limitations: ["One limitation."],
  figuresEquations: [],
  prerequisites: [],
  onboardingQuestions: [],
  initialPath: [{ label: "Problem", purpose: "Orient", prerequisiteIds: [] }],
  firstMove: { kind: "orient", target: "Problem", message: "Start from the problem." },
  referencesUsed: ["paper-a"],
};

function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-teaching-context-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "paper");
  const mission = path.join(project, "missions", "primary-mission");
  fs.mkdirSync(path.join(project, "runtime"), { recursive: true });
  fs.mkdirSync(path.join(project, "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(project, "materials"), { recursive: true });
  fs.mkdirSync(path.join(project, "map"), { recursive: true });
  fs.mkdirSync(mission, { recursive: true });
  fs.writeFileSync(path.join(learning, "workspace.json"), JSON.stringify({
    schema_version: "0.2",
    id: "ws_context123",
    active_project_id: "paper",
  }), "utf8");
  fs.writeFileSync(path.join(project, "project.json"), JSON.stringify({
    schema_version: "0.2",
    id: "paper",
    title: "Paper",
    status: "active",
    active_mission_id: "primary-mission",
    maintenance_status: "none",
  }), "utf8");
  fs.writeFileSync(path.join(mission, "mission.json"), JSON.stringify({
    schema_version: "0.2",
    id: "primary-mission",
    project_id: "paper",
  }), "utf8");
  fs.writeFileSync(path.join(mission, "MISSION.md"), "# Mission\n", "utf8");
  fs.writeFileSync(path.join(learning, "LEARNER.md"), [
    "<!-- profile_revision: 1 -->",
    "# Learner",
    "- Preferred language: Chinese",
    "- Self-reported weaknesses: eigenvalues",
  ].join("\n"), "utf8");
  return root;
}

test("Teacher routing context joins durable profile and Mission paper plan without Runtime writes", () => {
  const root = makeWorkspace();
  const context = resolveProjectReadContext(root);
  assert.ok(context);
  writePaperLearningContext(context, plan, "2026-09-19T00:00:00Z");

  const routing = readTeachingRoutingContext(root);
  assert.equal(routing.learnerProfile?.preferredLanguage, "Chinese");
  assert.equal(routing.learnerProfile?.reportedWeaknesses, "eigenvalues");
  assert.equal(routing.paperLearning?.plan.sourceTitle, "Paper A");
  assert.equal(routing.paperLearning?.generatedAt, "2026-09-19T00:00:00Z");
});
