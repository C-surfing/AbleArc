import { readLearnerProfile, type LearnerProfile } from "./learner-profile";
import { readPaperLearningContext } from "./paper-session";
import { resolveProjectReadContext } from "./project-store";
import type { PaperLearningPlan } from "./paper-learning";

export interface TeachingRoutingContext {
  learnerProfile?: Omit<LearnerProfile, "revision" | "updatedAt">;
  paperLearning?: {
    generatedAt: string;
    plan: PaperLearningPlan;
  };
}

export function readTeachingRoutingContext(repoRoot: string): TeachingRoutingContext {
  const context = resolveProjectReadContext(repoRoot);
  if (!context) return {};

  const learner = readLearnerProfile(context.learnerPath);
  const { revision: _revision, updatedAt: _updatedAt, ...profile } = learner;
  const hasProfile = Object.values(profile).some((value) => Boolean(value));

  const paper = readPaperLearningContext(context);
  return {
    ...(hasProfile ? { learnerProfile: profile } : {}),
    ...(paper ? {
      paperLearning: {
        generatedAt: paper.generatedAt,
        plan: paper.plan,
      },
    } : {}),
  };
}
