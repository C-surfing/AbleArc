export type CompletionGateState =
  | "configuration_required"
  | "collecting_evidence"
  | "ready"
  | "completed"
  | "unverified_completed";

export type CompletionCriterionKind =
  | "feynman"
  | "performance"
  | "application"
  | "transfer"
  | "retrieval";

export interface CompletionCriterionProgress {
  id: string;
  capability: string;
  kind: CompletionCriterionKind;
  required: boolean;
  passed: boolean;
  minimumEvidence: number;
  qualifyingEvidenceIds: string[];
  citedEvidenceIds: string[];
}

export interface CompletionGateStatus {
  status: CompletionGateState;
  ready: boolean;
  projectId: string;
  missionId: string;
  reason?: string;
  requiredCount: number;
  passedRequiredCount: number;
  hasDistinctEvidence: boolean;
  criteria: CompletionCriterionProgress[];
  completionId?: string;
  completedAt?: string;
}

const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const EVIDENCE_ID = /^ev_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const COMPLETION_ID = /^comp_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const STATES: CompletionGateState[] = [
  "configuration_required",
  "collecting_evidence",
  "ready",
  "completed",
  "unverified_completed",
];
const KINDS: CompletionCriterionKind[] = [
  "feynman",
  "performance",
  "application",
  "transfer",
  "retrieval",
];

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as Record<string, unknown>;
}

function localId(value: unknown, label: string): string {
  if (typeof value !== "string" || !LOCAL_ID.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function evidenceIds(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value)
    || value.length > 30
    || value.some((item) => typeof item !== "string" || !EVIDENCE_ID.test(item))
    || new Set(value).size !== value.length
  ) throw new Error(`${label} is invalid.`);
  return value as string[];
}

function criterion(value: unknown): CompletionCriterionProgress {
  const item = object(value, "Completion criterion");
  const kind = item.kind;
  const minimumEvidence = item.minimum_evidence;
  if (
    typeof item.capability !== "string"
    || !item.capability.trim()
    || item.capability.length > 500
    || typeof kind !== "string"
    || !KINDS.includes(kind as CompletionCriterionKind)
    || typeof item.required !== "boolean"
    || typeof item.passed !== "boolean"
    || !Number.isInteger(minimumEvidence)
    || Number(minimumEvidence) < 1
    || Number(minimumEvidence) > 5
  ) throw new Error("Completion criterion is invalid.");
  return {
    id: localId(item.id, "Completion criterion id"),
    capability: item.capability.trim(),
    kind: kind as CompletionCriterionKind,
    required: item.required,
    passed: item.passed,
    minimumEvidence: Number(minimumEvidence),
    qualifyingEvidenceIds: evidenceIds(
      item.qualifying_evidence_ids,
      "Qualifying completion Evidence",
    ),
    citedEvidenceIds: evidenceIds(item.cited_evidence_ids, "Cited completion Evidence"),
  };
}

export function parseCompletionGateStatus(
  value: unknown,
  expectedProjectId: string,
): CompletionGateStatus {
  const item = object(value, "Completion Gate status");
  const status = item.status;
  const projectId = localId(item.project_id, "Completion Project id");
  const missionId = localId(item.mission_id, "Completion Mission id");
  if (
    projectId !== expectedProjectId
    || typeof status !== "string"
    || !STATES.includes(status as CompletionGateState)
    || typeof item.ready !== "boolean"
    || !Array.isArray(item.criteria)
    || item.criteria.length > 30
  ) throw new Error("Completion Gate status is invalid.");

  const criteria = item.criteria.map(criterion);
  if (new Set(criteria.map((entry) => entry.id)).size !== criteria.length) {
    throw new Error("Completion criterion ids are not unique.");
  }
  const required = criteria.filter((entry) => entry.required);
  const reportedRequired = item.required_count;
  const reportedPassed = item.passed_required_count;
  const hasEvaluation = status === "collecting_evidence"
    || status === "ready"
    || status === "completed";
  if (
    hasEvaluation
    && (
      !Number.isInteger(reportedRequired)
      || !Number.isInteger(reportedPassed)
      || reportedRequired !== required.length
      || reportedPassed !== required.filter((entry) => entry.passed).length
      || typeof item.has_distinct_feynman_and_performance_evidence !== "boolean"
    )
  ) throw new Error("Completion Gate counts are inconsistent.");
  const feynmanEvidence = required
    .filter((entry) => entry.kind === "feynman" && entry.passed)
    .flatMap((entry) => entry.qualifyingEvidenceIds);
  const performanceEvidence = required
    .filter((entry) => ["performance", "application", "transfer"].includes(entry.kind) && entry.passed)
    .flatMap((entry) => entry.qualifyingEvidenceIds);
  const computedDistinct = feynmanEvidence.some(
    (first) => performanceEvidence.some((second) => first !== second),
  );
  if (
    hasEvaluation
    && item.has_distinct_feynman_and_performance_evidence !== computedDistinct
  ) throw new Error("Completion Gate Evidence provenance is inconsistent.");
  const computedReady = required.length > 0
    && required.every((entry) => entry.passed)
    && feynmanEvidence.length > 0
    && performanceEvidence.length > 0
    && computedDistinct;
  if (
    item.ready !== (status === "ready" || status === "completed")
    || (hasEvaluation && item.ready !== computedReady)
    || ((status === "configuration_required" || status === "unverified_completed")
      && typeof item.reason !== "string")
  ) throw new Error("Completion Gate state is inconsistent.");

  const completionId = item.completion_id;
  const completedAt = item.completed_at;
  if (
    status === "completed"
    && (
      typeof completionId !== "string"
      || !COMPLETION_ID.test(completionId)
      || typeof completedAt !== "string"
      || !completedAt
    )
  ) throw new Error("Verified completion provenance is invalid.");

  return {
    status: status as CompletionGateState,
    ready: item.ready,
    projectId,
    missionId,
    reason: typeof item.reason === "string" ? item.reason : undefined,
    requiredCount: hasEvaluation ? Number(reportedRequired) : 0,
    passedRequiredCount: hasEvaluation ? Number(reportedPassed) : 0,
    hasDistinctEvidence: hasEvaluation
      ? Boolean(item.has_distinct_feynman_and_performance_evidence)
      : false,
    criteria,
    completionId: typeof completionId === "string" ? completionId : undefined,
    completedAt: typeof completedAt === "string" ? completedAt : undefined,
  };
}
