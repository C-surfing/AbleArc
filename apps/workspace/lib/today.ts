import type { WorkspaceSnapshot } from "./types";

export type TodayActionKind = "respond" | "resume" | "await-assessment" | "read-only";

export interface TodayRecommendation {
  kind: TodayActionKind;
  eyebrow: string;
  action: string;
  rationale: string;
  cta: string;
}

export function deriveTodayRecommendation(snapshot: WorkspaceSnapshot): TodayRecommendation {
  const projectReadOnly = snapshot.projectStatus === "paused"
    || (snapshot.projectStatus === "archived" && snapshot.maintenanceStatus !== "study_active");

  if (projectReadOnly) {
    return {
      kind: "read-only",
      eyebrow: "Project is read-only",
      action: "Re-enter the Project deliberately before recording new learning evidence.",
      rationale: snapshot.projectStatus === "paused"
        ? "Paused Projects preserve continuity without accepting new learning turns."
        : "Archived Projects stay read-only unless a maintenance review is explicitly opened.",
      cta: "Open project workspace",
    };
  }

  if (snapshot.latestExchange?.status === "awaiting_assessment") {
    return {
      kind: "await-assessment",
      eyebrow: "Response saved",
      action: "Review the current turn and continue when the saved response has been assessed.",
      rationale: "Your response is already recorded. AbleArc should not ask you to repeat the same evidence-bearing action.",
      cta: "Open current session",
    };
  }

  if (snapshot.decision && !snapshot.decision.hasLearnerResponse) {
    return {
      kind: "respond",
      eyebrow: "Your next move",
      action: snapshot.decision.learnerAction,
      rationale: snapshot.decision.rationale,
      cta: "Start this move",
    };
  }

  return {
    kind: "resume",
    eyebrow: "Continue the frontier",
    action: snapshot.expectedLearnerAction || snapshot.nextMove || `Continue working on ${snapshot.frontier}.`,
    rationale: snapshot.frontierReason || "This is the current frontier in the accepted learner model.",
    cta: "Continue learning",
  };
}

export function entryProjectTitle(goal: string): string {
  const normalized = goal.trim().replace(/\s+/g, " ");
  if (!normalized) return "New learning arc";
  const firstClause = normalized.split(/[.!?。！？]/, 1)[0]?.trim() || normalized;
  return firstClause.length <= 72 ? firstClause : `${firstClause.slice(0, 69).trimEnd()}…`;
}
