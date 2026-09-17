import type { DailyContext } from "./daily-context.ts";
import { deriveTodayRecommendation, type TodayRecommendation } from "./today.ts";
import type { WorkspaceSnapshot } from "./types.ts";

export type RecommendationMoveType =
  | "current-runtime-move"
  | "frontier-deep-attempt"
  | "frontier-guided-attempt"
  | "frontier-short-retrieval"
  | "continue-frontier"
  | "none";

export interface RecommendationAuthority {
  createEvidence: false;
  changeMastery: false;
  reviseMap: false;
  completeMission: false;
}

export interface DailyRecommendation {
  primary: TodayRecommendation;
  moveType: RecommendationMoveType;
  sessionShape: string;
  contextRationale?: string;
  authority: RecommendationAuthority;
}

export const RECOMMENDATION_AUTHORITY: RecommendationAuthority = Object.freeze({
  createEvidence: false,
  changeMastery: false,
  reviseMap: false,
  completeMission: false,
});

function contextShape(context: DailyContext): {
  moveType: Exclude<RecommendationMoveType, "current-runtime-move" | "continue-frontier" | "none">;
  sessionShape: string;
  rationale: string;
} {
  const short = context.availableMinutes !== undefined && context.availableMinutes <= 15;
  const low = context.energy <= 2 || (context.focus !== undefined && context.focus <= 2);
  const high = context.energy >= 4
    && (context.focus === undefined || context.focus >= 4)
    && (context.availableMinutes === undefined || context.availableMinutes >= 30);

  if (short || low) {
    return {
      moveType: "frontier-short-retrieval",
      sessionShape: "Keep the session bounded: retrieve the core idea, expose one uncertainty, then stop or reassess.",
      rationale: short
        ? "The available block is short, so the recommendation favors a compact retrieval/probe shape."
        : "Current energy or focus is low, so the recommendation favors retrieval and a small diagnostic move over a long derivation.",
    };
  }
  if (high) {
    return {
      moveType: "frontier-deep-attempt",
      sessionShape: "Use the block for an independent, minimally scaffolded attempt before asking for explanation or hints.",
      rationale: "Current energy, focus, and available time support a deeper independent attempt at the frontier.",
    };
  }
  return {
    moveType: "frontier-guided-attempt",
    sessionShape: "Use one bounded attempt with enough structure to keep momentum, then reassess from the resulting evidence.",
    rationale: "Current context supports a medium-size learning move without assuming a long deep-work block.",
  };
}

export function deriveDailyRecommendation(
  snapshot: WorkspaceSnapshot,
  context?: DailyContext,
): DailyRecommendation {
  const primary = deriveTodayRecommendation(snapshot);

  if (primary.kind === "read-only" || primary.kind === "await-assessment") {
    return {
      primary,
      moveType: "none",
      sessionShape: primary.kind === "read-only"
        ? "Do not create a new learning turn until the Project is deliberately made writable."
        : "Do not repeat the learner action while the existing response is awaiting assessment.",
      authority: RECOMMENDATION_AUTHORITY,
    };
  }

  if (!context) {
    return {
      primary,
      moveType: snapshot.decision && !snapshot.decision.hasLearnerResponse
        ? "current-runtime-move"
        : "continue-frontier",
      sessionShape: "Continue the current Runtime-guided move without additional context adaptation.",
      authority: RECOMMENDATION_AUTHORITY,
    };
  }

  const shaped = contextShape(context);
  if (snapshot.decision && !snapshot.decision.hasLearnerResponse) {
    return {
      primary,
      moveType: "current-runtime-move",
      sessionShape: shaped.sessionShape,
      contextRationale: `${shaped.rationale} The current Runtime decision remains the cognitive action; DailyContext changes only how the session is shaped around it.`,
      authority: RECOMMENDATION_AUTHORITY,
    };
  }

  return {
    primary,
    moveType: shaped.moveType,
    sessionShape: shaped.sessionShape,
    contextRationale: shaped.rationale,
    authority: RECOMMENDATION_AUTHORITY,
  };
}
