import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  latestResearchCapabilityTrace,
  listResearchCapabilityTraces,
  writeResearchCapabilityTrace,
} from "./capability-store.ts";

function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-capability-"));
  const learning = path.join(root, ".learning");
  const project = path.join(learning, "projects", "project-one");
  const mission = path.join(project, "missions", "mission-one");
  const decisions = path.join(project, "runtime", "receipts", "decisions");
  fs.mkdirSync(mission, { recursive: true });
  fs.mkdirSync(decisions, { recursive: true });

  fs.writeFileSync(path.join(learning, "workspace.json"), JSON.stringify({
    schema_version: "0.2",
    id: "ws_capability_test",
    active_project_id: "project-one",
  }));
  fs.writeFileSync(path.join(project, "project.json"), JSON.stringify({
    schema_version: "0.2",
    id: "project-one",
    title: "Capability test",
    status: "active",
    maintenance_status: "none",
    active_mission_id: "mission-one",
  }));
  fs.writeFileSync(path.join(mission, "mission.json"), JSON.stringify({
    schema_version: "0.2",
    id: "mission-one",
    project_id: "project-one",
  }));
  fs.writeFileSync(path.join(decisions, "dec_research01.json"), JSON.stringify({
    schema_version: "0.2",
    kind: "decision",
    id: "dec_research01",
    workspace_id: "ws_capability_test",
    project_id: "project-one",
    mission_id: "mission-one",
    created_at: "2026-09-18T12:00:00Z",
  }));
  return root;
}

test("Research trace is Project-local operational data and leaves Runtime unchanged", (t) => {
  const root = makeWorkspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const runtimeRoot = path.join(root, ".learning", "projects", "project-one", "runtime");
  const before = fs.readdirSync(runtimeRoot, { recursive: true }).map(String).sort();
  const excerpt = "This exact source excerpt should not be copied into the trace store.";

  const trace = writeResearchCapabilityTrace(
    root,
    {
      expectedProjectId: "project-one",
      decisionId: "dec_research01",
      purpose: "Verify the mechanism used by the current learning move.",
      query: "What does the source support?",
      sources: [{
        id: "source-1",
        kind: "url",
        label: "Source one",
        locator: "https://example.test/source-1",
        excerpt,
      }],
    },
    {
      summary: "The source supports the bounded factual premise.",
      findings: [{
        claim: "The bounded premise is supported.",
        sourceIds: ["source-1"],
        status: "supported",
      }],
      unresolved: [],
      sourcesUsed: ["source-1"],
    },
  );

  assert.equal(trace.invocation.capability, "research");
  assert.equal(trace.invocation.decisionId, "dec_research01");
  assert.equal(trace.sources[0]?.id, "source-1");
  assert.match(trace.sources[0]?.excerptSha256 || "", /^[a-f0-9]{64}$/);

  const traces = listResearchCapabilityTraces(root);
  assert.equal(traces.length, 1);
  assert.equal(latestResearchCapabilityTrace(root, "dec_research01")?.invocation.id, trace.invocation.id);

  const capabilityRoot = path.join(
    root,
    ".learning",
    "projects",
    "project-one",
    "capabilities",
    "invocations",
  );
  const stored = fs.readFileSync(path.join(capabilityRoot, trace.invocation.id + ".json"), "utf8");
  assert.equal(stored.includes(excerpt), false);

  const after = fs.readdirSync(runtimeRoot, { recursive: true }).map(String).sort();
  assert.deepEqual(after, before);
});

test("Research trace rejects stale Project scope and unknown Decision", (t) => {
  const root = makeWorkspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const base = {
    purpose: "Verify",
    query: "Question",
    sources: [{
      id: "source-1",
      kind: "text" as const,
      label: "Source",
      excerpt: "Excerpt",
    }],
  };
  const result = {
    summary: "Summary",
    findings: [{
      claim: "Claim",
      sourceIds: ["source-1"],
      status: "supported" as const,
    }],
    unresolved: [],
    sourcesUsed: ["source-1"],
  };

  assert.throws(() => writeResearchCapabilityTrace(
    root,
    { ...base, expectedProjectId: "other-project", decisionId: "dec_research01" },
    result,
  ), /selected Project changed/);

  assert.throws(() => writeResearchCapabilityTrace(
    root,
    { ...base, expectedProjectId: "project-one", decisionId: "dec_missing01" },
    result,
  ), /Decision does not exist/);
});
