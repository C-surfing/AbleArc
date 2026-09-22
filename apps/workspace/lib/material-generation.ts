import type {
  LearningMaterialSummary,
  LearningMaterialType,
  WorkspaceSnapshot,
} from "./types";

export type MaterialGenerationScope = "active_lesson" | "library_deep";

export type MaterialPedagogyStep =
  | "prerequisite_bridge"
  | "intuition"
  | "low_dimensional_example"
  | "formal_model"
  | "implementation_or_boundary"
  | "retrieval_check";

export interface MaterialGenerationBrief {
  scope: MaterialGenerationScope;
  materialType: LearningMaterialType;
  mission: string;
  frontier: string;
  frontierReason: string;
  conceptIds: string[];
  learnerContext?: string;
  targetAction?: string;
  representationPurpose?: string;
  pedagogy: MaterialPedagogyStep[];
  bounds: {
    targetWords: [number, number];
    maxSections: number;
    activeLessonEligible: boolean;
  };
  provenance: {
    requireSourceOrEvidence: true;
    verifyExternalFacts: true;
    materialIsEvidence: false;
  };
  validation: {
    verifyNumericExamples: true;
    verifyExecutableCodeBeforeClaimingItRuns: true;
    keepUnverifiedClaimsExplicit: true;
  };
}

export interface MaterialLearningObjectCandidate {
  materialId: string;
  title: string;
  summary: string;
  whyReturn: string;
  objectKind: "explanation" | "worked_example" | "diagram";
  conceptIds: string[];
  relevanceScore: number;
  relevanceReasons: string[];
  learnerSelected: boolean;
  autoInject: false;
}

const ACTIVE_TYPES = new Set<LearningMaterialType>([
  "concept_note",
  "derivation",
  "worked_example",
  "formula_sheet",
  "code_artifact",
  "diagram",
  "misconception_note",
  "source_note",
  "feynman_explanation",
]);

const ACTIVE_BOUNDS: Record<LearningMaterialType, [number, number]> = {
  concept_note: [250, 700],
  derivation: [300, 900],
  worked_example: [300, 900],
  formula_sheet: [150, 500],
  code_artifact: [250, 800],
  diagram: [100, 450],
  misconception_note: [180, 500],
  source_note: [180, 600],
  feynman_explanation: [250, 700],
};

const DEEP_BOUNDS: Record<LearningMaterialType, [number, number]> = {
  concept_note: [1200, 3200],
  derivation: [1400, 3800],
  worked_example: [1200, 3200],
  formula_sheet: [600, 1800],
  code_artifact: [1000, 3000],
  diagram: [500, 1600],
  misconception_note: [800, 2200],
  source_note: [800, 2600],
  feynman_explanation: [1200, 3200],
};

function pedagogyFor(type: LearningMaterialType): MaterialPedagogyStep[] {
  if (type === "diagram") {
    return [
      "prerequisite_bridge",
      "intuition",
      "formal_model",
      "retrieval_check",
    ];
  }
  if (type === "formula_sheet" || type === "source_note") {
    return [
      "prerequisite_bridge",
      "formal_model",
      "implementation_or_boundary",
      "retrieval_check",
    ];
  }
  if (type === "code_artifact") {
    return [
      "prerequisite_bridge",
      "intuition",
      "low_dimensional_example",
      "implementation_or_boundary",
      "retrieval_check",
    ];
  }
  return [
    "prerequisite_bridge",
    "intuition",
    "low_dimensional_example",
    "formal_model",
    "implementation_or_boundary",
    "retrieval_check",
  ];
}

export function deriveMaterialGenerationBrief(
  snapshot: WorkspaceSnapshot,
  materialType: LearningMaterialType,
  scope: MaterialGenerationScope = "active_lesson",
): MaterialGenerationBrief {
  if (!snapshot.hasMission || !snapshot.mission.trim()) {
    throw new Error("Learning material generation requires an active Mission");
  }

  const bounds = scope === "active_lesson"
    ? ACTIVE_BOUNDS[materialType]
    : DEEP_BOUNDS[materialType];

  return {
    scope,
    materialType,
    mission: snapshot.mission,
    frontier: snapshot.frontier,
    frontierReason: snapshot.frontierReason,
    conceptIds: [...snapshot.map.frontier],
    ...(snapshot.learnerNote.trim() ? { learnerContext: snapshot.learnerNote.trim() } : {}),
    ...(snapshot.decision?.learnerAction ? { targetAction: snapshot.decision.learnerAction } : {}),
    ...(snapshot.decision?.representationPurpose
      ? { representationPurpose: snapshot.decision.representationPurpose }
      : {}),
    pedagogy: pedagogyFor(materialType),
    bounds: {
      targetWords: bounds,
      maxSections: scope === "active_lesson" ? 6 : 12,
      activeLessonEligible: scope === "active_lesson" && ACTIVE_TYPES.has(materialType),
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
  };
}

function objectKindForMaterial(
  type: LearningMaterialType,
): MaterialLearningObjectCandidate["objectKind"] {
  if (type === "diagram") return "diagram";
  if (
    type === "worked_example"
    || type === "derivation"
    || type === "formula_sheet"
    || type === "code_artifact"
  ) {
    return "worked_example";
  }
  return "explanation";
}

export function deriveMaterialLearningObjectCandidates(
  snapshot: WorkspaceSnapshot,
  learnerSelectedMaterialIds: string[] = [],
): MaterialLearningObjectCandidate[] {
  const selected = new Set(learnerSelectedMaterialIds);
  const frontier = new Set(snapshot.map.frontier);

  return snapshot.materials
    .map((material) => {
      const overlappingConcepts = material.conceptIds.filter((id) => frontier.has(id));
      const learnerSelected = selected.has(material.id);
      let relevanceScore = 0;
      const relevanceReasons: string[] = [];

      if (overlappingConcepts.length > 0) {
        relevanceScore += 100 + Math.min(overlappingConcepts.length, 3) * 10;
        relevanceReasons.push(
          `current frontier: ${overlappingConcepts.join(", ")}`,
        );
      }
      if (learnerSelected) {
        relevanceScore += 40;
        relevanceReasons.push("explicit learner selection");
      }
      if (material.evidenceCount > 0) {
        relevanceScore += 5;
        relevanceReasons.push("linked learning evidence");
      }
      if (material.sourceCount > 0) {
        relevanceScore += 5;
        relevanceReasons.push("linked source provenance");
      }

      return {
        materialId: material.id,
        title: material.title,
        summary: material.summary,
        whyReturn: material.whyReturn,
        objectKind: objectKindForMaterial(material.materialType),
        conceptIds: material.conceptIds,
        relevanceScore,
        relevanceReasons,
        learnerSelected,
        autoInject: false as const,
      };
    })
    .filter((candidate) => candidate.relevanceScore > 0)
    .sort((left, right) => (
      right.relevanceScore - left.relevanceScore
      || left.title.localeCompare(right.title)
    ));
}
