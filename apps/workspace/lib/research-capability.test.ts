import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { AgentAdapter, StructuredGenerationRequest } from "./agent-adapter.ts";
import { parseHostTurnInput } from "./host-turn.ts";
import {
  createResearchInvocation,
  runResearchCapability,
  validateResearchOutput,
} from "./research-capability.ts";
import {
  createResearchAuditRecord,
  writeResearchAuditRecord,
} from "./research-audit-store.ts";

function resolvedTurn() {
  return parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "workspace", conversationId: "conv-research-1" },
    message: "The paper seems to imply the improvement comes from parallelism. Check that claim against these excerpts.",
    projectId: "paper-project",
    missionId: "primary-mission",
    references: [
      {
        id: "paper-main",
        kind: "file",
        label: "Main paper",
        locator: "host://attachment/paper-main",
        excerpt: "The architecture removes recurrence and permits more parallel computation. The reported benchmark improves quality, but this excerpt does not isolate the causal contribution of parallelism.",
        mediaType: "application/pdf",
      },
      {
        id: "paper-ablation",
        kind: "text",
        label: "Ablation excerpt",
        excerpt: "The supplied ablation excerpt compares model variants but does not directly manipulate parallel execution.",
      },
    ],
    capabilities: ["read_attachment", "retrieve_source"],
  });
}

function generatedResearch(): Record<string, unknown> {
  return {
    summary: "The supplied sources support that the architecture enables more parallel computation, but they do not establish that parallelism caused the reported quality improvement.",
    findings: [
      {
        statement: "The architecture removes recurrence and permits more parallel computation.",
        source_ref_ids: ["paper-main"],
        relation: "supports",
        note: "This is directly stated in the supplied paper excerpt.",
      },
      {
        statement: "Parallelism is the cause of the benchmark improvement.",
        source_ref_ids: ["paper-main", "paper-ablation"],
        relation: "unclear",
        note: "The supplied excerpts do not isolate parallelism as the causal factor.",
      },
    ],
    conflicts: [],
    uncertainty: "The provided excerpts do not include an experiment that isolates the effect of parallel execution.",
    teacher_use: "Teach the distinction between an architectural property and a causal explanation of benchmark gains.",
  };
}

test("Research uses only resolved host sources and returns Teacher-facing provenance", async () => {
  let request: StructuredGenerationRequest | undefined;
  const adapter: AgentAdapter = {
    id: "fixture",
    model: "fixture-model",
    async generateStructured(value) {
      request = value;
      return generatedResearch();
    },
  };
  const invocation = createResearchInvocation({
    turn: resolvedTurn(),
    projectId: "paper-project",
    missionId: "primary-mission",
    purpose: "Resolve whether a causal interpretation is justified before teaching it.",
    mode: "verify_claim",
    query: "What do the supplied sources establish about parallelism?",
    claim: "The benchmark improvement is caused by parallelism.",
    invocationId: "capi_research_fixture_01",
    createdAt: "2026-09-19T00:00:00Z",
  });

  const result = await runResearchCapability(adapter, invocation);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.sourceRefs, ["paper-main", "paper-ablation"]);
  assert.match(result.output?.summary || "", /do not establish/);
  assert.match(request?.system || "", /Use only the supplied resolved source context/);
  assert.match(request?.system || "", /do not address the learner directly/);
  assert.match(request?.system || "", /Do not create or imply learner Evidence/);
  assert.match(request?.prompt || "", /caused by parallelism/);
});

test("Research requests host resolution instead of pretending an opaque PDF was read", async () => {
  let called = false;
  const adapter: AgentAdapter = {
    id: "fixture",
    model: "fixture-model",
    async generateStructured() {
      called = true;
      return generatedResearch();
    },
  };
  const turn = parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "assistant-host" },
    message: "Verify this claim from the PDF.",
    references: [{
      id: "paper-opaque",
      kind: "file",
      label: "Unread paper",
      locator: "host://attachment/paper-opaque",
      mediaType: "application/pdf",
    }],
    capabilities: ["read_attachment"],
  });
  const invocation = createResearchInvocation({
    turn,
    projectId: "paper-project",
    missionId: "primary-mission",
    purpose: "Verify a source-dependent claim.",
    mode: "verify_claim",
    query: "Does the source make this claim?",
    claim: "The method always improves accuracy.",
    invocationId: "capi_research_fixture_02",
    createdAt: "2026-09-19T00:00:00Z",
  });

  const result = await runResearchCapability(adapter, invocation);
  assert.equal(result.status, "needs_host_action");
  assert.equal(result.requestedHostCapability, "read_attachment");
  assert.deepEqual(result.sourceRefs, []);
  assert.deepEqual(result.unresolvedReferenceIds, ["paper-opaque"]);
  assert.equal(called, false);
});

test("Research rejects provider findings that cite unavailable sources or learner-state fields", () => {
  const hallucinated = generatedResearch();
  ((hallucinated.findings as Array<Record<string, unknown>>)[0]).source_ref_ids = ["web-result-not-provided"];
  assert.throws(
    () => validateResearchOutput(hallucinated, ["paper-main"]),
    /unavailable source reference/,
  );

  const authorityLeak = generatedResearch();
  authorityLeak.mastery = "stable";
  assert.throws(
    () => validateResearchOutput(authorityLeak, ["paper-main"]),
    /missing or unsupported fields/,
  );
});

test("Research audit is local, immutable, and excludes source excerpt bodies", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-research-audit-"));
  try {
    const invocation = createResearchInvocation({
      turn: resolvedTurn(),
      projectId: "paper-project",
      missionId: "primary-mission",
      purpose: "Check the causal claim before the Teacher explains it.",
      mode: "verify_claim",
      query: "Is parallelism established as the cause?",
      claim: "Parallelism caused the gain.",
      invocationId: "capi_research_fixture_03",
      createdAt: "2026-09-19T00:00:00Z",
    });
    const result = await runResearchCapability({
      id: "fixture",
      model: "fixture-model",
      async generateStructured() {
        return generatedResearch();
      },
    }, invocation);
    const audit = createResearchAuditRecord(invocation, result);
    const target = writeResearchAuditRecord(tmp, audit);
    const stored = fs.readFileSync(target, "utf8");

    assert.match(stored, /capi_research_fixture_03/);
    assert.match(stored, /paper-main/);
    assert.match(stored, /causal claim/);
    assert.doesNotMatch(stored, /architecture removes recurrence and permits more parallel computation/);
    assert.doesNotMatch(stored, /supplied ablation excerpt compares model variants/);

    assert.equal(writeResearchAuditRecord(tmp, audit), target);
    assert.throws(
      () => writeResearchAuditRecord(tmp, { ...audit, purpose: "Different purpose" }),
      /immutable/,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
