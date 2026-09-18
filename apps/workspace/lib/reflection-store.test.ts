import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { REFLECTION_AUTHORITY } from "./reflection.ts";
import {
  createReflection,
  deleteReflection,
  listReflections,
  readReflection,
  updateReflection,
} from "./reflection-store.ts";

function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-reflection-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "project-one");
  const mission = path.join(project, "missions", "mission-one");
  const decisions = path.join(project, "runtime", "receipts", "decisions");
  fs.mkdirSync(mission, { recursive: true });
  fs.mkdirSync(decisions, { recursive: true });

  fs.writeFileSync(path.join(learning, "workspace.json"), JSON.stringify({
    schema_version: "0.2",
    id: "ws_reflection_test",
    active_project_id: "project-one",
  }));
  fs.writeFileSync(path.join(project, "project.json"), JSON.stringify({
    schema_version: "0.2",
    id: "project-one",
    title: "Reflection test",
    status: "active",
    maintenance_status: "none",
    active_mission_id: "mission-one",
  }));
  fs.writeFileSync(path.join(mission, "mission.json"), JSON.stringify({
    schema_version: "0.2",
    id: "mission-one",
    project_id: "project-one",
  }));
  fs.writeFileSync(path.join(decisions, "dec_current.json"), JSON.stringify({
    id: "dec_current",
    kind: "decision",
    workspace_id: "ws_reflection_test",
    project_id: "project-one",
    mission_id: "mission-one",
    created_at: "2026-09-18T12:00:00Z",
  }));
  return root;
}

test("Reflection authority is explicitly separate from learner truth", () => {
  assert.deepEqual(REFLECTION_AUTHORITY, {
    createEvidence: false,
    changeMastery: false,
    reviseMap: false,
    completeMission: false,
  });
});

test("Reflection CRUD stays Project-local and never writes Runtime", (t) => {
  const root = makeWorkspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const runtimeRoot = path.join(root, ".learning", "projects", "project-one", "runtime");
  const runtimeBefore = fs.readdirSync(runtimeRoot, { recursive: true }).map(String).sort();

  const first = createReflection(
    root,
    " I understood the ordinary case, but I am still unsure about the boundary. ",
    {
      missionId: "mission-one",
      decisionId: "dec_current",
      conceptIds: ["boundary-case"],
      materialIds: [],
    },
    "project-one",
  );

  assert.equal(first.revision, 1);
  assert.equal(first.body, "I understood the ordinary case, but I am still unsure about the boundary.");
  assert.deepEqual(first.links, {
    missionId: "mission-one",
    decisionId: "dec_current",
    conceptIds: ["boundary-case"],
    materialIds: [],
  });
  assert.deepEqual(listReflections(root).map((item) => item.id), [first.id]);
  assert.deepEqual(readReflection(root, first.id), first);

  const second = updateReflection(
    root,
    first.id,
    1,
    "The uncertainty is specifically about deleting the only node.",
    {
      missionId: "mission-one",
      decisionId: "dec_current",
      conceptIds: ["boundary-case"],
      materialIds: [],
    },
    "project-one",
  );
  assert.equal(second.revision, 2);
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(second.body, "The uncertainty is specifically about deleting the only node.");

  assert.throws(
    () => updateReflection(
      root,
      first.id,
      1,
      "stale edit",
      { conceptIds: [], materialIds: [] },
      "project-one",
    ),
    /changed before/,
  );

  deleteReflection(root, first.id, 2, "project-one");
  assert.deepEqual(listReflections(root), []);

  const runtimeAfter = fs.readdirSync(runtimeRoot, { recursive: true }).map(String).sort();
  assert.deepEqual(runtimeAfter, runtimeBefore);
});

test("Reflection rejects stale Project scope and fabricated Runtime links", (t) => {
  const root = makeWorkspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.throws(
    () => createReflection(
      root,
      "A private note.",
      { conceptIds: [], materialIds: [] },
      "other-project",
    ),
    /selected Project changed/,
  );

  assert.throws(
    () => createReflection(
      root,
      "A private note.",
      {
        missionId: "mission-one",
        decisionId: "dec_missing",
        conceptIds: [],
        materialIds: [],
      },
      "project-one",
    ),
    /Decision link does not exist/,
  );

  assert.throws(
    () => createReflection(
      root,
      "A private note.",
      {
        conceptIds: ["../escape"],
        materialIds: [],
      },
      "project-one",
    ),
    /concept links/,
  );
});

test("Reflection content is bounded and deletion uses optimistic revision", (t) => {
  const root = makeWorkspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.throws(
    () => createReflection(root, "   ", { conceptIds: [], materialIds: [] }, "project-one"),
    /body/,
  );

  const record = createReflection(
    root,
    "Keep this learner-owned note.",
    { conceptIds: [], materialIds: [] },
    "project-one",
  );
  assert.throws(
    () => deleteReflection(root, record.id, record.revision + 1, "project-one"),
    /changed before/,
  );
  assert.equal(readReflection(root, record.id).body, record.body);
});
