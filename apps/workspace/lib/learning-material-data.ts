import type { LearningMaterialSummary, LearningMaterialType } from "./types";

const MATERIAL_ID = /^mat_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const WORKSPACE_ID = /^ws_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const EVIDENCE_ID = /^ev_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const MATERIAL_TYPES = new Set<LearningMaterialType>([
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
const FIELDS = new Set([
  "schema_version", "kind", "id", "workspace_id", "project_id", "mission_id",
  "material_type", "title", "summary", "why_return", "body_markdown",
  "concept_ids", "evidence_ids", "source_refs", "tags", "created_at",
]);

export interface LearningMaterialDetail extends LearningMaterialSummary {
  bodyMarkdown: string;
  evidenceIds: string[];
  sourceRefs: string[];
  tags: string[];
}

export function isLearningMaterialId(value: string): boolean {
  return MATERIAL_ID.test(value);
}

function text(value: unknown, maximum: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : undefined;
}

function stringArray(
  value: unknown,
  maximumItems: number,
  maximumLength: number,
  pattern?: RegExp,
): string[] | undefined {
  if (!Array.isArray(value) || value.length > maximumItems) return undefined;
  const items = value.map((item) => text(item, maximumLength));
  if (items.some((item) => item === undefined)) return undefined;
  const result = items as string[];
  if (new Set(result).size !== result.length) return undefined;
  if (pattern && result.some((item) => !pattern.test(item))) return undefined;
  return result;
}

export function parseLearningMaterialDetail(
  input: unknown,
  expectedWorkspaceId: string,
  expectedProjectId: string,
): LearningMaterialDetail {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("LearningMaterial must be an object");
  }
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== FIELDS.size || Object.keys(value).some((key) => !FIELDS.has(key))) {
    throw new Error("LearningMaterial fields are invalid");
  }
  if (
    value.schema_version !== "0.1"
    || value.kind !== "learning-material"
    || typeof value.id !== "string"
    || !MATERIAL_ID.test(value.id)
    || value.workspace_id !== expectedWorkspaceId
    || !WORKSPACE_ID.test(expectedWorkspaceId)
    || value.project_id !== expectedProjectId
    || !LOCAL_ID.test(expectedProjectId)
    || typeof value.mission_id !== "string"
    || !LOCAL_ID.test(value.mission_id)
    || typeof value.material_type !== "string"
    || !MATERIAL_TYPES.has(value.material_type as LearningMaterialType)
  ) {
    throw new Error("LearningMaterial identity or scope is invalid");
  }
  const title = text(value.title, 200);
  const summary = text(value.summary, 800);
  const whyReturn = text(value.why_return, 800);
  const bodyMarkdown = text(value.body_markdown, 100_000);
  const conceptIds = stringArray(value.concept_ids, 30, 64, LOCAL_ID);
  const evidenceIds = stringArray(value.evidence_ids, 30, 131, EVIDENCE_ID);
  const sourceRefs = stringArray(value.source_refs, 20, 1000);
  const tags = stringArray(value.tags, 20, 64);
  const createdAt = text(value.created_at, 100);
  if (
    !title || !summary || !whyReturn || !bodyMarkdown || !conceptIds || !evidenceIds
    || !sourceRefs || !tags || !createdAt || Number.isNaN(Date.parse(createdAt))
    || (evidenceIds.length === 0 && sourceRefs.length === 0)
  ) {
    throw new Error("LearningMaterial content or provenance is invalid");
  }
  if (
    (["misconception_note", "feynman_explanation"].includes(value.material_type)
      && evidenceIds.length === 0)
    || (value.material_type === "source_note" && sourceRefs.length === 0)
  ) {
    throw new Error("LearningMaterial type provenance is invalid");
  }
  return {
    id: value.id,
    missionId: value.mission_id,
    materialType: value.material_type as LearningMaterialType,
    title,
    summary,
    whyReturn,
    conceptIds,
    evidenceCount: evidenceIds.length,
    sourceCount: sourceRefs.length,
    createdAt,
    bodyMarkdown,
    evidenceIds,
    sourceRefs,
    tags,
  };
}

export function parseLearningMaterialSummary(
  input: unknown,
  expectedWorkspaceId: string,
  expectedProjectId: string,
): LearningMaterialSummary {
  const detail = parseLearningMaterialDetail(input, expectedWorkspaceId, expectedProjectId);
  return {
    id: detail.id,
    missionId: detail.missionId,
    materialType: detail.materialType,
    title: detail.title,
    summary: detail.summary,
    whyReturn: detail.whyReturn,
    conceptIds: detail.conceptIds,
    evidenceIds: detail.evidenceIds,
    evidenceCount: detail.evidenceCount,
    sourceCount: detail.sourceCount,
    createdAt: detail.createdAt,
  };
}
