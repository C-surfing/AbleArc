import type {
  CompletionCriterionKind,
  CompletionGateStatus,
} from "./completion-status";

export const PAPER_COMPLETION_CRITERION_IDS = [
  "reconstruct-paper-case",
  "explain-paper-method",
  "connect-claims-evidence",
  "identify-paper-boundaries",
  "delayed-paper-reconstruction",
  "transfer-paper-judgment",
] as const;

export type PaperCompletionCriterionId =
  typeof PAPER_COMPLETION_CRITERION_IDS[number];

export interface PaperCompletionCriterion {
  id: PaperCompletionCriterionId;
  capability: string;
  kind: CompletionCriterionKind;
  required: true;
  minimum_level: "recall" | "explanation" | "application" | "transfer";
  max_scaffolding: "none" | "light";
  minimum_context: "same" | "varied" | "novel";
  minimum_delay: "immediate" | "delayed";
  minimum_independence: "independent";
  minimum_evidence: 1;
  artifact_forms: string[];
  evidence_ids: string[];
}

export interface PaperCompletionCriteriaPayload {
  criteria: PaperCompletionCriterion[];
}

const EVIDENCE_ID = /^ev_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;

const TEMPLATE: ReadonlyArray<Omit<PaperCompletionCriterion, "evidence_ids">> = [
  {
    id: "reconstruct-paper-case",
    capability:
      "Reconstruct the paper's problem, why it matters, and what limitation or gap in prior approaches motivates the work.",
    kind: "feynman",
    required: true,
    minimum_level: "explanation",
    max_scaffolding: "light",
    minimum_context: "same",
    minimum_delay: "immediate",
    minimum_independence: "independent",
    minimum_evidence: 1,
    artifact_forms: [],
  },
  {
    id: "explain-paper-method",
    capability:
      "Explain the paper's core idea and how the method or mechanism is supposed to address the stated problem.",
    kind: "feynman",
    required: true,
    minimum_level: "explanation",
    max_scaffolding: "light",
    minimum_context: "same",
    minimum_delay: "immediate",
    minimum_independence: "independent",
    minimum_evidence: 1,
    artifact_forms: [],
  },
  {
    id: "connect-claims-evidence",
    capability:
      "Given a claim from the paper, connect it to the relevant reported evidence and distinguish what that evidence supports from what it does not establish.",
    kind: "application",
    required: true,
    minimum_level: "application",
    max_scaffolding: "light",
    minimum_context: "varied",
    minimum_delay: "immediate",
    minimum_independence: "independent",
    minimum_evidence: 1,
    artifact_forms: [],
  },
  {
    id: "identify-paper-boundaries",
    capability:
      "Identify meaningful limitations, assumptions, or boundary conditions and relate them to the paper's claims and existing knowledge.",
    kind: "application",
    required: true,
    minimum_level: "application",
    max_scaffolding: "light",
    minimum_context: "varied",
    minimum_delay: "immediate",
    minimum_independence: "independent",
    minimum_evidence: 1,
    artifact_forms: [],
  },
  {
    id: "delayed-paper-reconstruction",
    capability:
      "After a delay and without replaying the paper, retrieve the central problem, core idea, and claim-evidence structure.",
    kind: "retrieval",
    required: true,
    minimum_level: "recall",
    max_scaffolding: "none",
    minimum_context: "same",
    minimum_delay: "delayed",
    minimum_independence: "independent",
    minimum_evidence: 1,
    artifact_forms: [],
  },
  {
    id: "transfer-paper-judgment",
    capability:
      "Use the paper's argument and evidence structure to reason about a neighboring paper, hypothetical experiment, or related problem in a novel context.",
    kind: "transfer",
    required: true,
    minimum_level: "transfer",
    max_scaffolding: "light",
    minimum_context: "novel",
    minimum_delay: "immediate",
    minimum_independence: "independent",
    minimum_evidence: 1,
    artifact_forms: [],
  },
];

function evidenceIds(value: unknown, criterionId: string): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value)
    || value.length > 30
    || value.some((item) => typeof item !== "string" || !EVIDENCE_ID.test(item))
    || new Set(value).size !== value.length
  ) {
    throw new Error(`Evidence links for ${criterionId} are invalid.`);
  }
  return [...value] as string[];
}

export function createPaperCompletionCriteria(
  evidenceByCriterion: Partial<Record<PaperCompletionCriterionId, string[]>> = {},
): PaperCompletionCriteriaPayload {
  const unsupported = Object.keys(evidenceByCriterion).filter(
    (key) => !PAPER_COMPLETION_CRITERION_IDS.includes(key as PaperCompletionCriterionId),
  );
  if (unsupported.length) {
    throw new Error(`Unknown paper completion criterion: ${unsupported.join(", ")}.`);
  }
  return {
    criteria: TEMPLATE.map((criterion) => ({
      ...criterion,
      artifact_forms: [...criterion.artifact_forms],
      evidence_ids: evidenceIds(evidenceByCriterion[criterion.id], criterion.id),
    })),
  };
}

export interface PaperCompletionProgress {
  passed: number;
  required: number;
  ready: boolean;
  delayedRetrievalPassed: boolean;
  transferPassed: boolean;
  missing: PaperCompletionCriterionId[];
}

export function derivePaperCompletionProgress(
  status: CompletionGateStatus,
): PaperCompletionProgress | undefined {
  const criteria = new Map(status.criteria.map((criterion) => [criterion.id, criterion]));
  if (!PAPER_COMPLETION_CRITERION_IDS.every((id) => criteria.has(id))) return undefined;

  const paperCriteria = PAPER_COMPLETION_CRITERION_IDS.map((id) => criteria.get(id)!);
  return {
    passed: paperCriteria.filter((criterion) => criterion.passed).length,
    required: paperCriteria.length,
    ready: status.ready && paperCriteria.every((criterion) => criterion.passed),
    delayedRetrievalPassed: Boolean(criteria.get("delayed-paper-reconstruction")?.passed),
    transferPassed: Boolean(criteria.get("transfer-paper-judgment")?.passed),
    missing: PAPER_COMPLETION_CRITERION_IDS.filter((id) => !criteria.get(id)?.passed),
  };
}
