import type { WorkspaceSnapshot } from "./types";

export type LearningObjectKind =
  | "prompt"
  | "explanation"
  | "diagram"
  | "interactive"
  | "worked_example"
  | "attempt"
  | "hint"
  | "feedback"
  | "evidence_update";

type LearningObjectBase = {
  id: string;
  kind: LearningObjectKind;
  priority: "primary" | "supporting" | "status";
  learnerOwned: boolean;
};

export type PromptLearningObject = LearningObjectBase & {
  kind: "prompt";
  title: string;
  learnerAction: string;
  rationale?: string;
};

export type DiagramLearningObject = LearningObjectBase & {
  kind: "diagram";
  representation: string;
  purpose?: string;
};

export type InteractiveLearningObject = LearningObjectBase & {
  kind: "interactive";
  representation: string;
  purpose?: string;
  artifactId: string;
};

export type RepresentationLearningObject =
  | DiagramLearningObject
  | InteractiveLearningObject;

export type AttemptLearningObject = LearningObjectBase & {
  kind: "attempt";
  state: "open" | "submitted" | "read_only";
  prompt: string;
};

export type FeedbackLearningObject = LearningObjectBase & {
  kind: "feedback";
  response: string;
  feedback: string;
  outcome?: "supports" | "contradicts" | "inconclusive";
};

export type EvidenceUpdateLearningObject = LearningObjectBase & {
  kind: "evidence_update";
  state: "accepted" | "review_required";
  concept?: string;
  before?: string;
  after?: string;
  reason?: string;
};

export type LearningObjectDescriptor =
  | PromptLearningObject
  | DiagramLearningObject
  | InteractiveLearningObject
  | AttemptLearningObject
  | FeedbackLearningObject
  | EvidenceUpdateLearningObject;

function projectWritable(snapshot: WorkspaceSnapshot): boolean {
  return snapshot.projectStatus === undefined
    || snapshot.projectStatus === "active"
    || (
      snapshot.projectStatus === "archived"
      && snapshot.maintenanceStatus === "study_active"
    );
}

export function deriveLearningObjects(snapshot: WorkspaceSnapshot): LearningObjectDescriptor[] {
  if (!snapshot.hasMission) return [];

  const decisionKey = snapshot.decision?.id || snapshot.projectId || "current";
  const objects: LearningObjectDescriptor[] = [
    {
      id: `prompt:${decisionKey}`,
      kind: "prompt",
      priority: "primary",
      learnerOwned: false,
      title: snapshot.nextMove,
      learnerAction: snapshot.expectedLearnerAction,
      rationale: snapshot.decision?.rationale,
    },
    snapshot.artifact
      ? {
          id: `interactive:${snapshot.artifact.id}`,
          kind: "interactive",
          priority: "primary",
          learnerOwned: false,
          representation: snapshot.artifact.renderer,
          purpose: snapshot.artifact.learningGoal,
          artifactId: snapshot.artifact.id,
        }
      : {
          id: `diagram:${decisionKey}`,
          kind: "diagram",
          priority: "supporting",
          learnerOwned: false,
          representation: snapshot.decision?.representationKind || "structure",
          purpose: snapshot.decision?.representationPurpose,
        },
    {
      id: `attempt:${decisionKey}`,
      kind: "attempt",
      priority: "primary",
      learnerOwned: true,
      state: !projectWritable(snapshot)
        ? "read_only"
        : snapshot.decision?.hasLearnerResponse
          ? "submitted"
          : "open",
      prompt: snapshot.expectedLearnerAction,
    },
  ];

  if (snapshot.latestExchange?.status === "assessed" && snapshot.latestExchange.feedback) {
    objects.push({
      id: `feedback:${snapshot.latestExchange.observationId}`,
      kind: "feedback",
      priority: "primary",
      learnerOwned: false,
      response: snapshot.latestExchange.response,
      feedback: snapshot.latestExchange.feedback,
      outcome: snapshot.latestExchange.outcome,
    });
  }

  if (snapshot.latestStateDecision?.decision === "accepted") {
    objects.push({
      id: `evidence-update:${snapshot.latestStateDecision.id}`,
      kind: "evidence_update",
      priority: "status",
      learnerOwned: false,
      state: "accepted",
      concept: snapshot.latestStateDecision.concept,
      before: snapshot.latestStateDecision.before,
      after: snapshot.latestStateDecision.after,
      reason: snapshot.latestStateDecision.reason,
    });
  } else if (snapshot.pendingStateProposalCount > 0) {
    objects.push({
      id: `evidence-update:pending:${decisionKey}`,
      kind: "evidence_update",
      priority: "status",
      learnerOwned: false,
      state: "review_required",
    });
  }

  return objects;
}

export function learningObjectByKind<TKind extends LearningObjectDescriptor["kind"]>(
  objects: LearningObjectDescriptor[],
  kind: TKind,
): Extract<LearningObjectDescriptor, { kind: TKind }> | undefined {
  return objects.find((object): object is Extract<LearningObjectDescriptor, { kind: TKind }> => object.kind === kind);
}
