import type { MasteryState } from "./types.ts";

export interface LearnerStateReplayEvent {
  decisionId: string;
  proposalId: string;
  createdAt: string;
  conceptId: string;
  conceptLabel: string;
  before: MasteryState;
  after: MasteryState;
  reason: string;
  authority: string;
  evidenceCount: number;
  policyOverridden: boolean;
  turn?: {
    id: string;
    outcome: string;
    summary: string;
  };
}

export interface LearnerStateReplay {
  projectId: string;
  runtimeRevision: number;
  events: LearnerStateReplayEvent[];
}

const STATES = new Set<MasteryState>(["unknown", "exposed", "developing", "stable", "transferable"]);
const LOCAL_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,130}$/;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max = 1200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`${label} must be non-empty text.`);
  }
  return value.trim();
}

function localId(value: unknown, label: string): string {
  const result = text(value, label, 131);
  if (!LOCAL_ID.test(result)) throw new Error(`${label} is invalid.`);
  return result;
}

function state(value: unknown, label: string): MasteryState {
  if (typeof value !== "string" || !STATES.has(value as MasteryState)) {
    throw new Error(`${label} is not a supported learner state.`);
  }
  return value as MasteryState;
}

export function parseLearnerStateReplay(input: unknown, expectedProjectId: string): LearnerStateReplay {
  const value = object(input, "Learner-state replay");
  const projectId = text(value.project_id, "project_id", 128);
  if (projectId !== expectedProjectId) throw new Error("Learner-state replay Project scope changed.");
  const runtimeRevision = value.runtime_revision;
  if (typeof runtimeRevision !== "number" || !Number.isInteger(runtimeRevision) || runtimeRevision < 0) {
    throw new Error("runtime_revision must be a non-negative integer.");
  }
  if (!Array.isArray(value.events) || value.events.length > 200) {
    throw new Error("Learner-state replay events must be a bounded list.");
  }

  let previousCreatedAt: string | undefined;
  const events = value.events.map((entry, index): LearnerStateReplayEvent => {
    const item = object(entry, `events[${index}]`);
    const before = state(item.before, `events[${index}].before`);
    const after = state(item.after, `events[${index}].after`);
    if (before === after) throw new Error("Learner-state replay cannot contain a no-op transition.");
    const createdAt = text(item.created_at, `events[${index}].created_at`, 100);
    if (previousCreatedAt && createdAt > previousCreatedAt) {
      throw new Error("Learner-state replay must be newest-first.");
    }
    previousCreatedAt = createdAt;
    const evidenceCount = item.evidence_count;
    if (typeof evidenceCount !== "number" || !Number.isInteger(evidenceCount) || evidenceCount < 1 || evidenceCount > 100) {
      throw new Error("Replay evidence_count must be a positive bounded integer.");
    }
    if (typeof item.policy_overridden !== "boolean") {
      throw new Error("Replay policy_overridden must be a boolean.");
    }
    const authority = object(item.authority, `events[${index}].authority`);
    let turn: LearnerStateReplayEvent["turn"];
    if (item.turn !== null && item.turn !== undefined) {
      const turnValue = object(item.turn, `events[${index}].turn`);
      turn = {
        id: localId(turnValue.id, `events[${index}].turn.id`),
        outcome: text(turnValue.outcome, `events[${index}].turn.outcome`, 80),
        summary: text(turnValue.summary, `events[${index}].turn.summary`, 1600),
      };
    }
    return {
      decisionId: localId(item.decision_id, `events[${index}].decision_id`),
      proposalId: localId(item.proposal_id, `events[${index}].proposal_id`),
      createdAt,
      conceptId: localId(item.concept_id, `events[${index}].concept_id`),
      conceptLabel: text(item.concept_label, `events[${index}].concept_label`, 240),
      before,
      after,
      reason: text(item.reason, `events[${index}].reason`, 1600),
      authority: `${text(authority.type, "authority.type", 80)}:${text(authority.id, "authority.id", 160)}`,
      evidenceCount,
      policyOverridden: item.policy_overridden,
      turn,
    };
  });

  if (events.length > runtimeRevision) {
    throw new Error("Replay has more accepted transitions than the Runtime revision.");
  }
  return { projectId, runtimeRevision, events };
}
