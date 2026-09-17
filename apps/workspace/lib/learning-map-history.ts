import type { LearningNodeKind } from "./types.ts";

export type LearningMapHistoryChange =
  | "added"
  | "removed"
  | "node_changed"
  | "entered_frontier"
  | "left_frontier"
  | "relations_changed";

export interface LearningMapNodeHistorySnapshot {
  label: string;
  kind: LearningNodeKind;
  missionRelevance: "core" | "supporting" | "optional";
  frontier: boolean;
  relations: string[];
}

export interface LearningMapNodeHistoryEvent {
  revision: number;
  updatedAt: string;
  rationale: string;
  evidenceCount: number;
  changes: LearningMapHistoryChange[];
  before?: LearningMapNodeHistorySnapshot;
  after?: LearningMapNodeHistorySnapshot;
}

export interface LearningMapNodeHistory {
  projectId: string;
  nodeId: string;
  currentRevision: number;
  events: LearningMapNodeHistoryEvent[];
}

const CHANGE_KINDS = new Set<LearningMapHistoryChange>([
  "added",
  "removed",
  "node_changed",
  "entered_frontier",
  "left_frontier",
  "relations_changed",
]);
const NODE_KINDS = new Set<LearningNodeKind>(["concept", "procedure", "strategy"]);
const RELEVANCE = new Set(["core", "supporting", "optional"] as const);

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is invalid`);
  return value.trim();
}

function integer(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${label} is invalid`);
  return value as number;
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${label} is invalid`);
  }
  return value.map((item) => (item as string).trim());
}

function snapshot(value: unknown, label: string): LearningMapNodeHistorySnapshot | undefined {
  if (value === null) return undefined;
  const item = object(value, label);
  const kind = text(item.kind, `${label}.kind`) as LearningNodeKind;
  const missionRelevance = text(item.mission_relevance, `${label}.mission_relevance`) as "core" | "supporting" | "optional";
  if (!NODE_KINDS.has(kind)) throw new Error(`${label}.kind is invalid`);
  if (!RELEVANCE.has(missionRelevance)) throw new Error(`${label}.mission_relevance is invalid`);
  if (typeof item.frontier !== "boolean") throw new Error(`${label}.frontier is invalid`);
  return {
    label: text(item.label, `${label}.label`),
    kind,
    missionRelevance,
    frontier: item.frontier,
    relations: strings(item.relations, `${label}.relations`),
  };
}

export function parseLearningMapNodeHistory(
  value: unknown,
  expectedProjectId: string,
  expectedNodeId: string,
): LearningMapNodeHistory {
  const root = object(value, "LearningMap node history");
  const projectId = text(root.project_id, "history project_id");
  const nodeId = text(root.node_id, "history node_id");
  if (projectId !== expectedProjectId) throw new Error("LearningMap history Project scope is invalid");
  if (nodeId !== expectedNodeId) throw new Error("LearningMap history node scope is invalid");
  if (!Array.isArray(root.events)) throw new Error("LearningMap history events are invalid");
  const currentRevision = integer(root.current_revision, "history current_revision");
  let previousRevision = Number.POSITIVE_INFINITY;
  const events = root.events.map((raw, index): LearningMapNodeHistoryEvent => {
    const item = object(raw, `history event ${index}`);
    const revision = integer(item.revision, `history event ${index}.revision`);
    if (revision > currentRevision || revision >= previousRevision) {
      throw new Error("LearningMap history event ordering is invalid");
    }
    previousRevision = revision;
    const changes = strings(item.changes, `history event ${index}.changes`) as LearningMapHistoryChange[];
    if (!changes.length || changes.some((change) => !CHANGE_KINDS.has(change))) {
      throw new Error("LearningMap history change kinds are invalid");
    }
    const before = snapshot(item.before, `history event ${index}.before`);
    const after = snapshot(item.after, `history event ${index}.after`);
    if (!before && !after) throw new Error("LearningMap history event must have before or after state");
    return {
      revision,
      updatedAt: text(item.updated_at, `history event ${index}.updated_at`),
      rationale: text(item.rationale, `history event ${index}.rationale`),
      evidenceCount: integer(item.evidence_count, `history event ${index}.evidence_count`),
      changes,
      before,
      after,
    };
  });
  return { projectId, nodeId, currentRevision, events };
}
