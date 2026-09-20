import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseCanonicalLearningMap } from "./learning-map-data.ts";
import { loadWorkspaceSnapshot } from "./workspace-data.ts";

function canonicalMap(): Record<string, unknown> {
  return {
    schema_version: "0.1",
    kind: "learning-map",
    project_id: "bayes",
    revision: 1,
    parent_revision: 0,
    created_at: "2026-09-16T00:00:00Z",
    updated_at: "2026-09-16T00:01:00Z",
    rationale: "Evidence located conditional direction as the nearest prerequisite.",
    evidence_ids: ["ev_example1"],
    frontier: ["bayes-reasoning"],
    nodes: [
      { id: "conditional", label: "Conditional probability", kind: "concept", mission_relevance: "supporting" },
      { id: "bayes-reasoning", label: "Bayes reasoning", kind: "strategy", mission_relevance: "core" },
    ],
    edges: [
      { id: "conditional-bayes", source: "conditional", target: "bayes-reasoning", relation: "prerequisite", confidence: "high" },
    ],
    delta: {
      added_node_ids: ["conditional", "bayes-reasoning"],
      removed_node_ids: [],
      changed_node_ids: [],
      added_edge_ids: ["conditional-bayes"],
      removed_edge_ids: [],
      changed_edge_ids: [],
      frontier_changed: true,
    },
  };
}

test("canonical map reader keeps topology separate from mastery", () => {
  const view = parseCanonicalLearningMap(canonicalMap(), "bayes");
  assert.equal(view.source, "structured");
  assert.equal(view.revision, 1);
  assert.equal(view.nodes[0].state, "unknown");
  assert.deepEqual(view.frontier, ["bayes-reasoning"]);
  assert.equal(view.edges[0].relation, "prerequisite");
});

test("canonical map reader fails closed on extra mastery or invalid scope", () => {
  const withMastery = canonicalMap();
  (withMastery.nodes as Array<Record<string, unknown>>)[0].state = "stable";
  assert.throws(() => parseCanonicalLearningMap(withMastery, "bayes"), /node 1 is invalid/);
  assert.throws(() => parseCanonicalLearningMap(canonicalMap(), "rust"), /canonical LearningMap is invalid/);

  const forgedInitial = canonicalMap();
  forgedInitial.revision = 0;
  forgedInitial.parent_revision = null;
  assert.throws(() => parseCanonicalLearningMap(forgedInitial, "bayes"), /revision is invalid/);
});


interface FixtureOptions {
  state?: string;
  roadmap?: string;
  canonicalMap?: boolean;
}

const MISSION_MD = [
  "# Mission",
  "",
  "- Goal: Explain how nonlinear hidden representations change what an MLP can express",
  "- Source: learner-explicit",
  "",
].join("\n");

const UNFILLED_STATE = [
  "# Current Learning State",
  "",
  "## Current frontier",
  "",
  "- Concept / capability:",
  "- State: `unknown | exposed | developing | stable | transferable`",
  "- Why this is the frontier:",
  "- What evidence would move the frontier:",
  "",
  "## Next move",
  "",
  "- Move:",
  "- Why now:",
  "",
].join("\n");

const FILLED_STATE = [
  "# Current Learning State",
  "",
  "## Current frontier",
  "",
  "- Concept / capability: XOR separability",
  "- State: developing",
  "- Why this is the frontier: The mechanism is repeated but never predicted.",
  "- What evidence would move the frontier: Predict the effect of removing the hidden layer.",
  "",
].join("\n");

function makeWorkspace(options: FixtureOptions = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-workspace-data-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "mlp-representations");
  const mission = path.join(project, "missions", "primary-mission");
  fs.mkdirSync(path.join(project, "map"), { recursive: true });
  fs.mkdirSync(path.join(project, "runtime", "receipts"), { recursive: true });
  fs.mkdirSync(mission, { recursive: true });

  fs.writeFileSync(path.join(learning, "workspace.json"), JSON.stringify({
    schema_version: "0.2",
    id: "ws_test_workspace_data",
    active_project_id: "mlp-representations",
  }));
  fs.writeFileSync(path.join(project, "project.json"), JSON.stringify({
    schema_version: "0.2",
    id: "mlp-representations",
    title: "MLP representations",
    status: "active",
    maintenance_status: "none",
    active_mission_id: "primary-mission",
  }));
  fs.writeFileSync(path.join(mission, "mission.json"), JSON.stringify({
    schema_version: "0.2",
    kind: "mission",
    id: "primary-mission",
    project_id: "mlp-representations",
    created_at: "2026-09-18T00:00:00+00:00",
  }));
  fs.writeFileSync(path.join(mission, "MISSION.md"), MISSION_MD);
  fs.writeFileSync(path.join(project, "STATE.md"), options.state ?? UNFILLED_STATE);

  if (options.roadmap !== undefined) {
    fs.writeFileSync(path.join(project, "map", "ROADMAP.md"), options.roadmap);
  }
  if (options.canonicalMap !== false) {
    fs.writeFileSync(path.join(project, "map", "current.json"), JSON.stringify({
      schema_version: "0.1",
      kind: "learning-map",
      project_id: "mlp-representations",
      revision: 0,
      parent_revision: null,
      created_at: "2026-09-18T00:00:00+00:00",
      updated_at: "2026-09-18T00:00:00+00:00",
      rationale: "Initial empty topology; no learner evidence has established a map yet.",
      evidence_ids: [],
      frontier: [],
      nodes: [],
      edges: [],
      delta: {
        added_node_ids: [], removed_node_ids: [], changed_node_ids: [],
        added_edge_ids: [], removed_edge_ids: [], changed_edge_ids: [],
        frontier_changed: false,
      },
    }));
  }
  return root;
}

test("unfilled STATE template never leaks or claims mastery", () => {
  const snapshot = loadWorkspaceSnapshot(makeWorkspace());

  for (const value of [snapshot.frontier, snapshot.frontierReason, snapshot.mission]) {
    assert.ok(!value.includes("unknown | exposed"));
    assert.ok(!value.includes("What evidence would move the frontier"));
  }
  assert.equal(snapshot.frontierState, "unknown");
  assert.equal(snapshot.evidence.length, 0);
  assert.ok(!snapshot.frontierReason.includes("state file marks this"));
});

test("only an explicit mastery token is accepted", () => {
  const root = makeWorkspace({
    state: [
      "# Current Learning State",
      "",
      "## Current frontier",
      "",
      "- Concept / capability: XOR separability",
      "- State: not yet stable enough to rely on without a diagram",
      "",
    ].join("\n"),
  });
  assert.equal(loadWorkspaceSnapshot(root).frontierState, "unknown");

  fs.writeFileSync(path.join(root, ".learning", "projects", "mlp-representations", "STATE.md"), FILLED_STATE);
  assert.equal(loadWorkspaceSnapshot(root).frontierState, "developing");
});

test("canonical v0.2 ROADMAP projection is parsed by headers, not legacy positions", () => {
  const snapshot = loadWorkspaceSnapshot(makeWorkspace({
    canonicalMap: false,
    state: FILLED_STATE,
    roadmap: [
      "# Learning Roadmap",
      "",
      "## Nodes",
      "",
      "| Node | ID | Kind | Mission relevance | Frontier |",
      "|---|---|---|---|---|",
      "| Hidden representation | hidden-representation | concept | core | yes |",
      "| Linear separability | linear-separability | concept | supporting | |",
      "",
    ].join("\n"),
  }));

  assert.deepEqual(snapshot.map.nodes.map((node) => node.id), ["hidden-representation", "linear-separability"]);
  assert.deepEqual(snapshot.map.nodes.map((node) => node.state), ["unknown", "unknown"]);
  assert.deepEqual(snapshot.map.nodes.map((node) => node.missionRelevance), ["core", "supporting"]);
});

test("empty ROADMAP placeholder row does not become a node", () => {
  const snapshot = loadWorkspaceSnapshot(makeWorkspace({
    canonicalMap: false,
    state: FILLED_STATE,
    roadmap: [
      "# Learning Roadmap",
      "",
      "## Nodes",
      "",
      "| Node | ID | Kind | Mission relevance | Frontier |",
      "|---|---|---|---|---|",
      "| No evidence-grounded nodes yet | — | — | — | — |",
      "",
    ].join("\n"),
  }));
  assert.deepEqual(snapshot.map.nodes, []);
});

test("legacy v0.1 ROADMAP layout remains readable", () => {
  const snapshot = loadWorkspaceSnapshot(makeWorkspace({
    canonicalMap: false,
    state: FILLED_STATE,
    roadmap: [
      "# Learning Roadmap",
      "",
      "## Nodes",
      "",
      "| Node | State | Depends on | Unlocks | Mission relevance | Evidence |",
      "|---|---|---|---|---|---|",
      "| Conditional probability | ● |  | Bayes | core | ev_1 |",
      "| Bayes reasoning | ◐ | Conditional probability |  | core |  |",
      "",
    ].join("\n"),
  }));
  assert.deepEqual(snapshot.map.nodes.map((node) => node.state), ["stable", "developing"]);
  assert.deepEqual(snapshot.map.edges.map((edge) => [edge.source, edge.target]), [
    ["conditional-probability", "bayes-reasoning"],
  ]);
});

test("untouched dogfooding SESSION template is not counted as a real session", () => {
  const root = makeWorkspace({ state: FILLED_STATE });
  const template = "# Session\n\n- Capability before:\n- Capability after:\n";
  fs.mkdirSync(path.join(root, "evaluation"), { recursive: true });
  fs.writeFileSync(path.join(root, "evaluation", "SESSION.md"), template);
  const sessionsDir = path.join(root, ".dogfooding", "mlp-arc", "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(path.join(sessionsDir, "001.md"), template);

  assert.equal(loadWorkspaceSnapshot(root).sessions.length, 0);

  fs.writeFileSync(path.join(sessionsDir, "001.md"), template + "\nReal learner observation.");
  assert.equal(loadWorkspaceSnapshot(root).sessions.length, 1);
});
