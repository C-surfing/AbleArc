import type { MasteryState, WorkspaceSnapshot } from "./types.ts";

export interface SessionCapabilityChange {
  concept: string;
  before: MasteryState;
  after: MasteryState;
}

export interface SessionCloseMaterial {
  id: string;
  title: string;
}

export interface SessionCloseUncertainty {
  target: string;
  uncertainty: "low" | "medium" | "high";
  rationale: string;
}

export interface TomorrowSeed {
  decisionId: string;
  target: string;
  action: string;
}

export interface SessionCloseDraft {
  sourceDecisionId: string;
  sourceObservationId: string;
  sourceEvidenceId: string;
  evidenceSummary: string;
  capabilityChange?: SessionCapabilityChange;
  unresolved?: SessionCloseUncertainty;
  materials: SessionCloseMaterial[];
  pendingProposalCount: number;
  tomorrowSeed?: TomorrowSeed;
}

export interface SessionCloseRecord extends SessionCloseDraft {
  schemaVersion: "0.1";
  revision: number;
  workspaceId: string;
  projectId: string;
  missionId: string;
  closedAt: string;
}

export function deriveSessionClose(snapshot: WorkspaceSnapshot): SessionCloseDraft {
  const exchange = snapshot.latestExchange;
  if (!snapshot.projectId || !snapshot.missionId) {
    throw new Error("Session Close requires an active workspace-v0.2 Project and Mission");
  }
  if (!exchange || exchange.status !== "assessed" || !exchange.evidenceId) {
    throw new Error("Session Close requires an assessed learner response");
  }
  const evidenceId = exchange.evidenceId;

  const currentDecision = snapshot.decision;
  const nextDecisionIsCurrent = Boolean(
    exchange.nextDecisionId
    && currentDecision
    && currentDecision.id === exchange.nextDecisionId
    && !currentDecision.hasLearnerResponse
  );

  const stateDecision = snapshot.latestStateDecision;
  const capabilityChange = stateDecision?.decision === "accepted"
    && stateDecision.evidenceIds.includes(evidenceId)
    ? {
        concept: stateDecision.concept,
        before: stateDecision.before,
        after: stateDecision.after,
      }
    : undefined;

  const materials = snapshot.materials
    .filter((material) => material.evidenceIds.includes(evidenceId))
    .map((material) => ({ id: material.id, title: material.title }));

  return {
    sourceDecisionId: exchange.decisionId,
    sourceObservationId: exchange.observationId,
    sourceEvidenceId: evidenceId,
    evidenceSummary: exchange.feedback || "Assessment recorded.",
    ...(capabilityChange ? { capabilityChange } : {}),
    ...(nextDecisionIsCurrent && currentDecision
      ? {
          unresolved: {
            target: currentDecision.target,
            uncertainty: currentDecision.uncertainty,
            rationale: currentDecision.rationale,
          },
          tomorrowSeed: {
            decisionId: currentDecision.id,
            target: currentDecision.target,
            action: currentDecision.learnerAction,
          },
        }
      : {}),
    materials,
    pendingProposalCount:
      snapshot.pendingStateProposalCount + snapshot.pendingMapProposalCount,
  };
}

export function relevantTomorrowSeed(
  close: SessionCloseRecord | undefined,
  snapshot: WorkspaceSnapshot,
): TomorrowSeed | undefined {
  const seed = close?.tomorrowSeed;
  if (
    !close
    || !seed
    || close.projectId !== snapshot.projectId
    || close.missionId !== snapshot.missionId
    || !snapshot.decision
    || snapshot.decision.id !== seed.decisionId
    || snapshot.decision.hasLearnerResponse
  ) {
    return undefined;
  }
  return seed;
}
