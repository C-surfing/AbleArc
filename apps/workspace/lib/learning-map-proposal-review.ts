export interface LearningMapProposalChanges {
  addedNodes: string[];
  removedNodes: string[];
  changedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
  changedEdges: string[];
  frontier: string[];
}

export interface LearningMapProposalReview {
  id: string;
  projectId: string;
  missionId: string;
  baseRevision: number;
  currentRevision: number;
  proposedBy: string;
  rationale: string;
  evidenceCount: number;
  stale: boolean;
  createdAt: string;
  changes: LearningMapProposalChanges;
}

const PROPOSAL_ID = /^mp_[A-Za-z0-9_-]{4,124}$/;

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

function changes(value: unknown): LearningMapProposalChanges {
  const input = object(value, "LearningMap proposal changes");
  const expected = [
    "added_nodes", "removed_nodes", "changed_nodes",
    "added_edges", "removed_edges", "changed_edges", "frontier",
  ];
  if (Object.keys(input).length !== expected.length || expected.some((key) => !(key in input))) {
    throw new Error("LearningMap proposal change fields are invalid");
  }
  return {
    addedNodes: strings(input.added_nodes, "added nodes"),
    removedNodes: strings(input.removed_nodes, "removed nodes"),
    changedNodes: strings(input.changed_nodes, "changed nodes"),
    addedEdges: strings(input.added_edges, "added edges"),
    removedEdges: strings(input.removed_edges, "removed edges"),
    changedEdges: strings(input.changed_edges, "changed edges"),
    frontier: strings(input.frontier, "proposed frontier"),
  };
}

export function parseLearningMapProposalReviews(
  value: unknown,
  expectedProjectId: string,
): LearningMapProposalReview[] {
  const root = object(value, "LearningMap proposal response");
  if (!Array.isArray(root.proposals)) throw new Error("LearningMap proposals are invalid");
  return root.proposals.map((raw, index) => {
    const item = object(raw, `LearningMap proposal ${index}`);
    const id = text(item.id, "proposal id");
    const projectId = text(item.project_id, "proposal project_id");
    const missionId = text(item.mission_id, "proposal mission_id");
    const baseRevision = integer(item.base_revision, "proposal base_revision");
    const currentRevision = integer(item.current_revision, "proposal current_revision");
    const evidenceCount = integer(item.evidence_count, "proposal evidence_count");
    if (!PROPOSAL_ID.test(id)) throw new Error("LearningMap proposal id is invalid");
    if (projectId !== expectedProjectId) throw new Error("LearningMap proposal Project scope is invalid");
    if (typeof item.stale !== "boolean" || item.stale !== (baseRevision !== currentRevision)) {
      throw new Error("LearningMap proposal stale status is invalid");
    }
    return {
      id,
      projectId,
      missionId,
      baseRevision,
      currentRevision,
      proposedBy: text(item.proposed_by, "proposal proposed_by"),
      rationale: text(item.rationale, "proposal rationale"),
      evidenceCount,
      stale: item.stale,
      createdAt: text(item.created_at, "proposal created_at"),
      changes: changes(item.changes),
    };
  });
}
