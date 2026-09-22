import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveMaterialGenerationBrief,
  deriveMaterialLearningObjectCandidates,
} from "./material-generation.ts";
import type { WorkspaceSnapshot } from "./types";

function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    agent: { configured: false, adapter: "openai-compatible" },
    source: "local",
    hasMission: true,
    mission: "Understand CUDA memory behavior well enough to choose optimizations.",
    learnerNote: "Comfortable with CUDA syntax; hardware path is still fuzzy.",
    frontier: "Cache miss path",
    frontierState: "developing",
    frontierReason: "Lower cache / DRAM behavior is not stable yet.",
    nextMove: "Trace one global load after an L1 miss.",
    expectedLearnerAction: "Explain the path and contrast it with shared-memory staging.",
    map: {
      source: "structured",
      revision: 2,
      frontier: ["cache-miss"],
      nodes: [
        {
          id: "cache-miss",
          label: "Cache miss path",
          kind: "procedure",
          state: "developing",
          missionRelevance: "core",
        },
        {
          id: "shared-memory",
          label: "Shared memory",
          kind: "concept",
          state: "exposed",
          missionRelevance: "core",
        },
      ],
      edges: [],
    },
    evidence: [],
    misconceptions: [],
    reviewCandidates: [],
    sessions: [],
    projects: [],
    materials: [
      {
        id: "mat_cache_example",
        missionId: "mission-cuda",
        materialType: "worked_example",
        title: "Trace one cache miss",
        summary: "A small memory-path example.",
        whyReturn: "Use when the lower-level path is fuzzy.",
        conceptIds: ["cache-miss"],
        evidenceIds: ["ev_cache_1"],
        evidenceCount: 1,
        sourceCount: 1,
        createdAt: "2026-09-22T00:00:00.000Z",
      },
      {
        id: "mat_shared_note",
        missionId: "mission-cuda",
        materialType: "concept_note",
        title: "Shared memory staging",
        summary: "A concise staging/reuse note.",
        whyReturn: "Use before tiling.",
        conceptIds: ["shared-memory"],
        evidenceIds: [],
        evidenceCount: 0,
        sourceCount: 1,
        createdAt: "2026-09-21T00:00:00.000Z",
      },
    ],
    pendingStateProposalCount: 0,
    pendingMapProposalCount: 0,
    projectId: "cuda",
    projectTitle: "CUDA",
    missionId: "mission-cuda",
    projectStatus: "active",
    maintenanceStatus: "none",
    decision: {
      id: "dec_cache",
      target: "Cache miss path",
      move: "contrast",
      rationale: "Expose the causal path.",
      learnerAction: "Trace one load, then contrast staging.",
      uncertainty: "medium",
      representationKind: "flow",
      representationPurpose: "Separate automatic cache behavior from explicit staging.",
      evidenceCount: 1,
      expectedEvidence: "A causal memory path.",
      falsificationSignal: "Every miss is treated as immediate DRAM.",
      hasLearnerResponse: false,
    },
    ...overrides,
  };
}

test("active material briefs are bounded and inherit current learning context", () => {
  const brief = deriveMaterialGenerationBrief(snapshot(), "worked_example");

  assert.equal(brief.scope, "active_lesson");
  assert.equal(brief.materialType, "worked_example");
  assert.deepEqual(brief.conceptIds, ["cache-miss"]);
  assert.equal(brief.targetAction, "Trace one load, then contrast staging.");
  assert.equal(brief.bounds.activeLessonEligible, true);
  assert.ok(brief.bounds.targetWords[1] <= 900);
  assert.deepEqual(brief.pedagogy, [
    "prerequisite_bridge",
    "intuition",
    "low_dimensional_example",
    "formal_model",
    "implementation_or_boundary",
    "retrieval_check",
  ]);
});

test("deep library material is kept outside the active lesson boundary", () => {
  const brief = deriveMaterialGenerationBrief(snapshot(), "concept_note", "library_deep");

  assert.equal(brief.scope, "library_deep");
  assert.equal(brief.bounds.activeLessonEligible, false);
  assert.ok(brief.bounds.targetWords[0] >= 1000);
  assert.equal(brief.provenance.materialIsEvidence, false);
});

test("generation requires an active Mission", () => {
  assert.throws(
    () => deriveMaterialGenerationBrief(snapshot({ hasMission: false, mission: "" }), "diagram"),
    /active Mission/,
  );
});

test("material candidates prioritize current frontier and never auto-inject", () => {
  const candidates = deriveMaterialLearningObjectCandidates(snapshot());

  assert.equal(candidates[0]?.materialId, "mat_cache_example");
  assert.equal(candidates[0]?.objectKind, "worked_example");
  assert.equal(candidates[0]?.autoInject, false);
  assert.match(candidates[0]?.relevanceReasons.join(" ") || "", /current frontier/);
});

test("explicit learner selection boosts a relevant library candidate without granting authority", () => {
  const candidates = deriveMaterialLearningObjectCandidates(
    snapshot(),
    ["mat_shared_note"],
  );

  const selected = candidates.find((candidate) => candidate.materialId === "mat_shared_note");
  assert.equal(selected?.learnerSelected, true);
  assert.equal(selected?.autoInject, false);
  assert.match(selected?.relevanceReasons.join(" ") || "", /explicit learner selection/);
});

test("unrelated unselected material is not surfaced as an active candidate", () => {
  const candidates = deriveMaterialLearningObjectCandidates(snapshot({
    materials: [
      {
        id: "mat_unrelated",
        missionId: "mission-cuda",
        materialType: "source_note",
        title: "Warp scheduling",
        summary: "Unrelated to the current frontier.",
        whyReturn: "Return during scheduling study.",
        conceptIds: ["warps"],
        evidenceIds: [],
        evidenceCount: 0,
        sourceCount: 1,
        createdAt: "2026-09-20T00:00:00.000Z",
      },
    ],
  }));

  assert.deepEqual(candidates, []);
});
