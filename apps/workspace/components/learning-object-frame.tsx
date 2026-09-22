"use client";

import type { ReactNode } from "react";
import type { LearningObjectDescriptor } from "@/lib/learning-objects";

const labels: Record<LearningObjectDescriptor["kind"], string> = {
  prompt: "Learning prompt",
  explanation: "Explanation",
  diagram: "Learning representation",
  interactive: "Interactive learning object",
  worked_example: "Worked example",
  attempt: "Learner attempt",
  hint: "Hint",
  feedback: "Feedback",
  evidence_update: "Learning state update",
};

export function LearningObjectFrame({
  object,
  children,
}: {
  object?: LearningObjectDescriptor;
  children: ReactNode;
}) {
  if (!object) return <>{children}</>;

  return (
    <div
      className="learning-object-frame"
      data-learning-object={object.kind}
      data-learning-priority={object.priority}
      data-learner-owned={object.learnerOwned ? "true" : "false"}
      data-learning-object-id={object.id}
      aria-label={labels[object.kind]}
    >
      {children}
    </div>
  );
}
