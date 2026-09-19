import type { DailyContext } from "./daily-context.ts";
import { readDailyContext } from "./daily-context-store.ts";
import { readLearnerProfile, type LearnerProfile } from "./learner-profile.ts";
import { readPaperLearningContext } from "./paper-session.ts";
import { resolveProjectReadContext } from "./project-store.ts";
import { readReviewPolicyContext, type ReviewPolicyContext } from "./review-policy.ts";
import type { PaperLearningPlan } from "./paper-learning.ts";

export type TeachingDailyContext = Pick<DailyContext, "energy" | "availableMinutes" | "focus" | "note">;

export interface TeachingRoutingContext {
  learnerProfile?: Omit<LearnerProfile, "revision" | "updatedAt">;
  dailyContext?: TeachingDailyContext;
  paperLearning?: {
    generatedAt: string;
    plan: PaperLearningPlan;
  };
  reviewPolicy?: ReviewPolicyContext;
}

export function readTeachingRoutingContext(repoRoot: string): TeachingRoutingContext {
  const context = resolveProjectReadContext(repoRoot);
  if (!context) return {};

  const learner = readLearnerProfile(context.learnerPath);
  const { revision: _revision, updatedAt: _updatedAt, ...profile } = learner;
  const hasProfile = Object.values(profile).some((value) => Boolean(value));

  const daily = readDailyContext(repoRoot);
  const dailyContext = daily ? {
    energy: daily.energy,
    ...(daily.availableMinutes ? { availableMinutes: daily.availableMinutes } : {}),
    ...(daily.focus ? { focus: daily.focus } : {}),
    ...(daily.note ? { note: daily.note } : {}),
  } : undefined;

  const paper = readPaperLearningContext(context);
  const reviewPolicy = readReviewPolicyContext(repoRoot);
  return {
    ...(hasProfile ? { learnerProfile: profile } : {}),
    ...(dailyContext ? { dailyContext } : {}),
    ...(paper ? {
      paperLearning: {
        generatedAt: paper.generatedAt,
        plan: paper.plan,
      },
    } : {}),
    ...(reviewPolicy ? { reviewPolicy } : {}),
  };
}
