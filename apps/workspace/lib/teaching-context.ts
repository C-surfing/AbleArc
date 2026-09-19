import { readLearnerProfile, type LearnerProfile } from "./learner-profile.ts";
import { readPaperLearningContext } from "./paper-session.ts";
import { resolveProjectReadContext } from "./project-store.ts";
import { readReviewPolicyContext, type ReviewPolicyContext } from "./review-policy.ts";
import type { PaperLearningPlan } from "./paper-learning.ts";

export interface TeachingRoutingContext {
  learnerProfile?: Omit<LearnerProfile, "revision" | "updatedAt">;
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

  const paper = readPaperLearningContext(context);
  const reviewPolicy = readReviewPolicyContext(repoRoot);
  return {
    ...(hasProfile ? { learnerProfile: profile } : {}),
    ...(paper ? {
      paperLearning: {
        generatedAt: paper.generatedAt,
        plan: paper.plan,
      },
    } : {}),
    ...(reviewPolicy ? { reviewPolicy } : {}),
  };
}
