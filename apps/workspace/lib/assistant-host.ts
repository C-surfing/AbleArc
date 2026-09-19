import type { HostReference, HostTurnInput, LearnerSelfReport } from "./host-turn";
import type { LearnerProfile } from "./learner-profile";
import type { WorkspaceSnapshot } from "./types";

export const ASSISTANT_HOST_OPERATIONS = [
  "start_or_continue_learning",
  "provide_learning_context",
  "get_learning_state",
] as const;

export type AssistantHostOperation = typeof ASSISTANT_HOST_OPERATIONS[number];

export interface AssistantLearningState {
  schemaVersion: "0.1";
  project?: {
    id: string;
    title: string;
    status: string;
    missionId?: string;
  };
  mission: string;
  frontier: {
    label: string;
    state: string;
    reason: string;
  };
  nextAction: {
    summary: string;
    learnerAction: string;
  };
  currentTurn?: {
    target: string;
    move: string;
    hasLearnerResponse: boolean;
  };
  map: {
    frontierIds: string[];
    nodes: Array<{
      id: string;
      label: string;
      state: string;
      missionRelevance: string;
    }>;
  };
  reviewCandidates: Array<{
    concept: string;
    reason: string;
    form: string;
  }>;
  recentEvidence: Array<{
    task: string;
    level: string;
    result: string;
    implication: string;
  }>;
  profile?: Omit<LearnerProfile, "revision" | "updatedAt">;
}

export interface AssistantLearningContext {
  schemaVersion: "0.1";
  host: HostTurnInput["host"];
  projectId?: string;
  missionId?: string;
  message: string;
  selfReport?: LearnerSelfReport;
  references: Array<{
    id: string;
    kind: HostReference["kind"];
    label?: string;
    locator?: string;
    mediaType?: string;
    resolved: boolean;
  }>;
  capabilities: HostTurnInput["capabilities"];
  persistence: "host_turn_only";
}

export function projectAssistantLearningState(
  snapshot: WorkspaceSnapshot,
  profile?: LearnerProfile,
): AssistantLearningState {
  return {
    schemaVersion: "0.1",
    ...(snapshot.projectId && snapshot.projectTitle
      ? {
          project: {
            id: snapshot.projectId,
            title: snapshot.projectTitle,
            status: snapshot.projectStatus ?? "active",
            ...(snapshot.missionId ? { missionId: snapshot.missionId } : {}),
          },
        }
      : {}),
    mission: snapshot.mission,
    frontier: {
      label: snapshot.frontier,
      state: snapshot.frontierState,
      reason: snapshot.frontierReason,
    },
    nextAction: {
      summary: snapshot.nextMove,
      learnerAction: snapshot.expectedLearnerAction,
    },
    ...(snapshot.decision
      ? {
          currentTurn: {
            target: snapshot.decision.target,
            move: snapshot.decision.move,
            hasLearnerResponse: snapshot.decision.hasLearnerResponse,
          },
        }
      : {}),
    map: {
      frontierIds: [...snapshot.map.frontier],
      nodes: snapshot.map.nodes.slice(0, 80).map((node) => ({
        id: node.id,
        label: node.label,
        state: node.state,
        missionRelevance: node.missionRelevance,
      })),
    },
    reviewCandidates: snapshot.reviewCandidates.slice(0, 10).map((candidate) => ({
      concept: candidate.concept,
      reason: candidate.reason,
      form: candidate.form,
    })),
    recentEvidence: snapshot.evidence.slice(0, 10).map((item) => ({
      task: item.task,
      level: item.level,
      result: item.result,
      implication: item.implication,
    })),
    ...(profile ? {
      profile: {
        ...(profile.preferredLanguage ? { preferredLanguage: profile.preferredLanguage } : {}),
        ...(profile.detailLevel ? { detailLevel: profile.detailLevel } : {}),
        ...(profile.intuitionFormalism ? { intuitionFormalism: profile.intuitionFormalism } : {}),
        ...(profile.socraticTolerance ? { socraticTolerance: profile.socraticTolerance } : {}),
        ...(profile.preferredPace ? { preferredPace: profile.preferredPace } : {}),
        ...(profile.priorExposure ? { priorExposure: profile.priorExposure } : {}),
        ...(profile.reportedStrengths ? { reportedStrengths: profile.reportedStrengths } : {}),
        ...(profile.reportedWeaknesses ? { reportedWeaknesses: profile.reportedWeaknesses } : {}),
        ...(profile.longTermGoals ? { longTermGoals: profile.longTermGoals } : {}),
        ...(profile.sourceContext ? { sourceContext: profile.sourceContext } : {}),
        ...(profile.technicalBackground ? { technicalBackground: profile.technicalBackground } : {}),
        ...(profile.toolsAndLanguages ? { toolsAndLanguages: profile.toolsAndLanguages } : {}),
        ...(profile.typicalSessionLength ? { typicalSessionLength: profile.typicalSessionLength } : {}),
        ...(profile.recurringConstraints ? { recurringConstraints: profile.recurringConstraints } : {}),
      },
    } : {}),
  };
}

export function normalizeAssistantLearningContext(
  turn: HostTurnInput,
): AssistantLearningContext {
  return {
    schemaVersion: "0.1",
    host: { ...turn.host },
    ...(turn.projectId ? { projectId: turn.projectId } : {}),
    ...(turn.missionId ? { missionId: turn.missionId } : {}),
    message: turn.message,
    ...(turn.selfReport ? { selfReport: { ...turn.selfReport } } : {}),
    references: turn.references.map((reference) => ({
      id: reference.id,
      kind: reference.kind,
      ...(reference.label ? { label: reference.label } : {}),
      ...(reference.locator ? { locator: reference.locator } : {}),
      ...(reference.mediaType ? { mediaType: reference.mediaType } : {}),
      resolved: Boolean(reference.excerpt),
    })),
    capabilities: [...turn.capabilities],
    persistence: "host_turn_only",
  };
}
