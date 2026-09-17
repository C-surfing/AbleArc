import type { WorkspaceSnapshot } from "./types.ts";

export type FocusSessionMode = "Teach" | "Study";

export function focusSessionMode(snapshot: WorkspaceSnapshot): FocusSessionMode {
  return snapshot.projectStatus === "archived" && snapshot.maintenanceStatus === "study_active"
    ? "Study"
    : "Teach";
}

export function isFocusSessionWritable(snapshot: WorkspaceSnapshot): boolean {
  return snapshot.projectStatus === undefined
    || snapshot.projectStatus === "active"
    || (
      snapshot.projectStatus === "archived"
      && snapshot.maintenanceStatus === "study_active"
    );
}

export interface FocusScaffold {
  level: number;
  label: string;
  text: string;
}

export function focusScaffolds(snapshot: WorkspaceSnapshot): FocusScaffold[] {
  const scaffolds: FocusScaffold[] = [];
  if (snapshot.decision?.expectedEvidence) {
    scaffolds.push({
      level: 1,
      label: "Evidence target",
      text: snapshot.decision.expectedEvidence,
    });
  }
  if (snapshot.decision?.falsificationSignal) {
    scaffolds.push({
      level: 2,
      label: "Self-check",
      text: `Before submitting, check whether your reasoning shows this failure signal: ${snapshot.decision.falsificationSignal}`,
    });
  }
  scaffolds.push({
    level: 3,
    label: snapshot.artifact ? "Use the representation" : "Expose the uncertain step",
    text: snapshot.artifact
      ? "Use the interactive representation as a thinking instrument, then explain the relation it reveals in your own words."
      : "Write the first step you are least certain about. Make that uncertainty explicit instead of asking for the final answer.",
  });
  return scaffolds;
}
