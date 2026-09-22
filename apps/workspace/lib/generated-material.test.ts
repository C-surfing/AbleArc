import assert from "node:assert/strict";
import test from "node:test";
import type { AgentAdapter, StructuredGenerationRequest } from "./agent-adapter.ts";
import {
  GeneratedMaterialValidationError,
  generateMaterialDraft,
  generatedMaterialDraftSchema,
  validateGeneratedMaterialDraft,
} from "./generated-material.ts";
import type { MaterialGenerationBrief } from "./material-generation.ts";

function brief(overrides: Partial<MaterialGenerationBrief> = {}): MaterialGenerationBrief {
  return {
    scope: "active_lesson",
    materialType: "worked_example",
    mission: "Understand CUDA memory behavior.",
    frontier: "Cache miss path",
    frontierReason: "The lower path is not yet stable.",
    conceptIds: ["cache-miss"],
    learnerContext: "Can write CUDA kernels.",
    targetAction: "Trace a miss and contrast shared-memory staging.",
    representationPurpose: "Expose the causal path.",
    pedagogy: [
      "prerequisite_bridge",
      "intuition",
      "low_dimensional_example",
      "formal_model",
      "implementation_or_boundary",
      "retrieval_check",
    ],
    bounds: {
      targetWords: [300, 900],
      maxSections: 6,
      activeLessonEligible: true,
    },
    provenance: {
      requireSourceOrEvidence: true,
      verifyExternalFacts: true,
      materialIsEvidence: false,
    },
    validation: {
      verifyNumericExamples: true,
      verifyExecutableCodeBeforeClaimingItRuns: true,
      keepUnverifiedClaimsExplicit: true,
    },
    ...overrides,
  };
}

function validDraft(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    material_type: "worked_example",
    title: "Trace one cache miss",
    summary: "A bounded worked example of the memory path.",
    why_return: "Use this when a cache miss is being collapsed into immediate DRAM.",
    body_markdown: [
      "## Intuition",
      "A miss means the requested line was not served by that cache level.",
      "## Small example",
      "Trace one coalesced global load through the lower hierarchy before comparing explicit staging.",
      "## Retrieval check",
      "Explain which parts are automatic and which are explicitly controlled by the kernel.",
    ].join("\n\n"),
    concept_ids: ["cache-miss"],
    source_candidates: ["https://docs.nvidia.com/cuda/cuda-c-programming-guide/"],
    tags: ["cuda", "memory"],
    verification: {
      numeric_examples: "not_applicable",
      executable_code: "not_applicable",
      external_facts: "requires_source_verification",
      claims_to_verify: ["CUDA cache-path details used in the worked example."],
    },
    ...overrides,
  };
}

class FakeAdapter implements AgentAdapter {
  readonly id = "fake";
  readonly model = "fake-model";
  requests: StructuredGenerationRequest[] = [];
  constructor(private readonly outputs: unknown[]) {}

  async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    this.requests.push(request);
    const index = Math.min(this.requests.length - 1, this.outputs.length - 1);
    return this.outputs[index];
  }
}

test("generated material schema is locked to the requested type and bounded body", () => {
  const schema = generatedMaterialDraftSchema(brief()) as {
    properties: {
      material_type: { enum: string[] };
      body_markdown: { maxLength: number };
    };
  };
  assert.deepEqual(schema.properties.material_type.enum, ["worked_example"]);
  assert.ok(schema.properties.body_markdown.maxLength <= 100_000);
});

test("valid draft stays anchored to the frontier and cannot self-certify verification", () => {
  const draft = validateGeneratedMaterialDraft(validDraft(), brief());

  assert.equal(draft.material_type, "worked_example");
  assert.deepEqual(draft.concept_ids, ["cache-miss"]);
  assert.equal(draft.verification.external_facts, "requires_source_verification");
  assert.equal(draft.verification.numeric_examples, "not_applicable");
});

test("draft rejects out-of-frontier concept ids", () => {
  assert.throws(
    () => validateGeneratedMaterialDraft(validDraft({ concept_ids: ["shared-memory"] }), brief()),
    (error: unknown) => (
      error instanceof GeneratedMaterialValidationError
      && error.path === "concept_ids"
    ),
  );
});

test("draft rejects opaque bibliography labels", () => {
  assert.throws(
    () => validateGeneratedMaterialDraft(
      validDraft({ source_candidates: ["NVIDIA CUDA Programming Guide"] }),
      brief(),
    ),
    /explicit verifiable references/,
  );
});

test("Provider output cannot claim host verification", () => {
  assert.throws(
    () => validateGeneratedMaterialDraft(validDraft({
      verification: {
        numeric_examples: "verified",
        executable_code: "not_applicable",
        external_facts: "requires_source_verification",
        claims_to_verify: [],
      },
    }), brief()),
    /cannot claim/,
  );
});

test("generation retries a locally invalid structured draft with the exact validation problem", async () => {
  const adapter = new FakeAdapter([
    validDraft({ concept_ids: ["invented-concept"] }),
    validDraft(),
  ]);

  const generated = await generateMaterialDraft(adapter, brief());

  assert.equal(generated.title, "Trace one cache miss");
  assert.equal(adapter.requests.length, 2);
  assert.match(adapter.requests[1]?.prompt || "", /Validation path: concept_ids/);
  assert.match(adapter.requests[0]?.system || "", /Do not create Evidence/);
});

test("library-deep drafts still use the same non-authority and verification boundary", async () => {
  const adapter = new FakeAdapter([validDraft()]);
  const deep = brief({
    scope: "library_deep",
    bounds: {
      targetWords: [1200, 3200],
      maxSections: 12,
      activeLessonEligible: false,
    },
  });

  const generated = await generateMaterialDraft(adapter, deep);
  assert.equal(generated.verification.external_facts, "requires_source_verification");
  assert.match(adapter.requests[0]?.system || "", /Requested scope: library_deep/);
});
