import type { MasteryState } from "./types.ts";

export interface StateProposalReview {
  id: string;
  projectId?: string;
  missionId?: string;
  conceptId: string;
  concept: string;
  before: MasteryState;
  after: MasteryState;
  currentState: MasteryState;
  rationale: string;
  proposedBy: string;
  evidenceCount: number;
  policyIssues: string[];
  stale: boolean;
  createdAt: string;
}

const states: MasteryState[] = ["unknown", "exposed", "developing", "stable", "transferable"];
const RECEIPT_ID = /^sp_[A-Za-z0-9_-]+$/;

function state(value: unknown, label: string): MasteryState {
  if (typeof value !== "string" || !states.includes(value as MasteryState)) {
    throw new Error(`State proposal ${label} is invalid`);
  }
  return value as MasteryState;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`State proposal ${label} is invalid`);
  }
  return value.trim();
}

export function parseStateProposalReviews(value: unknown, expectedProjectId: string): StateProposalReview[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("State proposal response must be an object");
  }
  const raw = (value as Record<string, unknown>).proposals;
  if (!Array.isArray(raw)) throw new Error("State proposal response is missing proposals");

  return raw.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("State proposal entry must be an object");
    }
    const proposal = item as Record<string, unknown>;
    const id = requiredString(proposal.id, "id");
    if (!RECEIPT_ID.test(id)) throw new Error("State proposal id is invalid");
    const projectId = proposal.project_id === null || proposal.project_id === undefined
      ? undefined
      : requiredString(proposal.project_id, "project_id");
    if (projectId && projectId !== expectedProjectId) {
      throw new Error("State proposal Project scope is invalid");
    }
    const missionId = proposal.mission_id === null || proposal.mission_id === undefined
      ? undefined
      : requiredString(proposal.mission_id, "mission_id");
    const policyIssues = proposal.policy_issues;
    if (!Array.isArray(policyIssues) || policyIssues.some((issue) => typeof issue !== "string" || !issue.trim())) {
      throw new Error("State proposal policy issues are invalid");
    }
    const evidenceCount = proposal.evidence_count;
    if (!Number.isInteger(evidenceCount) || Number(evidenceCount) < 0) {
      throw new Error("State proposal evidence count is invalid");
    }
    if (typeof proposal.stale !== "boolean") throw new Error("State proposal stale flag is invalid");

    return {
      id,
      projectId,
      missionId,
      conceptId: requiredString(proposal.concept_id, "concept_id"),
      concept: requiredString(proposal.concept_label, "concept_label"),
      before: state(proposal.before, "before"),
      after: state(proposal.after, "after"),
      currentState: state(proposal.current_state, "current_state"),
      rationale: requiredString(proposal.rationale, "rationale"),
      proposedBy: requiredString(proposal.proposed_by, "proposed_by"),
      evidenceCount: Number(evidenceCount),
      policyIssues: policyIssues.map((issue) => String(issue).trim()),
      stale: proposal.stale,
      createdAt: requiredString(proposal.created_at, "created_at"),
    };
  });
}
