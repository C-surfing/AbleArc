import assert from "node:assert/strict";
import test from "node:test";
import type { AgentAdapter, StructuredGenerationRequest } from "./agent-adapter.ts";
import { CAPABILITY_AUTHORITY } from "./capability.ts";
import { parseHostTurnInput } from "./host-turn.ts";
import {
  researchRequestFromHostTurn,
  runResearchCapability,
  validateResearchCapabilityResult,
} from "./research-capability.ts";

const sources = [
  {
    id: "paper-a",
    kind: "url" as const,
    label: "Paper A",
    locator: "https://example.test/paper-a",
    excerpt: "The reported mechanism depends on the base rate.",
  },
  {
    id: "notes-b",
    kind: "text" as const,
    label: "Course notes",
    excerpt: "Posterior probability depends on both sensitivity and prevalence.",
  },
];

test("Capability has no learner-state authority", () => {
  assert.deepEqual(CAPABILITY_AUTHORITY, {
    createObservation: false,
    createEvidence: false,
    changeMastery: false,
    reviseMap: false,
    completeMission: false,
  });
});

test("Research validates grounded source references and rejects invented sources", () => {
  const result = validateResearchCapabilityResult({
    summary: "Both sources support using prevalence in the posterior update.",
    findings: [{
      claim: "Prevalence changes the posterior after a positive result.",
      sourceIds: ["paper-a", "notes-b"],
      status: "supported",
    }],
    unresolved: [],
    sourcesUsed: ["paper-a", "notes-b"],
  }, sources);
  assert.equal(result.findings[0]?.status, "supported");

  assert.throws(() => validateResearchCapabilityResult({
    summary: "Invented support.",
    findings: [{
      claim: "Unsupported claim.",
      sourceIds: ["source-that-does-not-exist"],
      status: "supported",
    }],
    unresolved: [],
    sourcesUsed: ["source-that-does-not-exist"],
  }, sources), /unknown or duplicate source ids/);
});

test("Research Capability asks the provider to synthesize sources without assessing the learner", async () => {
  let captured: StructuredGenerationRequest | undefined;
  const adapter: AgentAdapter = {
    id: "fixture",
    model: "fixture-model",
    async generateStructured(request) {
      captured = request;
      return {
        summary: "The excerpts agree that prevalence matters.",
        findings: [{
          claim: "Prevalence contributes to the posterior.",
          sourceIds: ["paper-a", "notes-b"],
          status: "supported",
        }],
        unresolved: [],
        sourcesUsed: ["paper-a", "notes-b"],
      };
    },
  };
  const result = await runResearchCapability(adapter, {
    expectedProjectId: "bayes",
    decisionId: "dec_research01",
    purpose: "Verify the factual premise before explaining base-rate effects.",
    query: "Does prevalence affect the posterior?",
    sources,
  });
  assert.equal(result.sourcesUsed.length, 2);
  assert.match(captured?.system || "", /not teaching and not learner assessment/);
  assert.match(captured?.system || "", /Do not infer learner mastery/);
  assert.match(captured?.system || "", /Use only the supplied source excerpts/);
  assert.match(captured?.prompt || "", /paper-a/);
});

test("Plugin/host adapter maps retrieved source excerpts into the same Research request", () => {
  const turn = parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "chatgpt-plugin", conversationId: "conv:1" },
    message: "Use this paper to check the explanation.",
    projectId: "bayes",
    missionId: "mission-one",
    references: [{
      id: "paper-a",
      kind: "url",
      label: "Paper A",
      locator: "https://example.test/paper-a",
      excerpt: "The reported mechanism depends on the base rate.",
    }],
    capabilities: ["retrieve_source"],
  });
  const request = researchRequestFromHostTurn(
    turn,
    "dec_research01",
    "Verify a factual premise for the current move.",
    "Does the paper support this mechanism?",
  );
  assert.equal(request.expectedProjectId, "bayes");
  assert.equal(request.sources[0]?.id, "paper-a");

  const noRetrieval = parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "plain-chat" },
    message: "Use this.",
    projectId: "bayes",
    references: [{
      id: "paper-a",
      kind: "text",
      label: "Pasted excerpt",
      excerpt: "Some source text.",
    }],
    capabilities: [],
  });
  assert.throws(
    () => researchRequestFromHostTurn(noRetrieval, "dec_research01", "Verify", "Question"),
    /does not declare retrieve_source/,
  );
});
