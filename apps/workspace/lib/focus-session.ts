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


export const ASSESSMENT_FAILURE_TYPES = [
  "provider_configuration",
  "provider_timeout",
  "provider_refusal",
  "provider_request",
  "provider_invalid_response",
  "structured_output_validation",
  "runtime_conflict",
  "runtime_failure",
  "network",
  "unknown",
] as const;

export type AssessmentFailureType = typeof ASSESSMENT_FAILURE_TYPES[number];

export interface AssessmentFailure {
  type: AssessmentFailureType;
  message: string;
}

export function normalizeAssessmentFailureType(value: unknown): AssessmentFailureType {
  return typeof value === "string" && (ASSESSMENT_FAILURE_TYPES as readonly string[]).includes(value)
    ? value as AssessmentFailureType
    : "unknown";
}

export function assessmentFailureLabel(type: AssessmentFailureType): string {
  if (type === "provider_configuration") return "Provider configuration";
  if (type === "provider_timeout") return "Provider timeout";
  if (type === "provider_refusal") return "Provider refusal";
  if (type === "provider_request") return "Provider request";
  if (type === "provider_invalid_response") return "Provider response";
  if (type === "structured_output_validation") return "Structured-output validation";
  if (type === "runtime_conflict") return "Runtime conflict";
  if (type === "runtime_failure") return "Runtime failure";
  if (type === "network") return "Network failure";
  return "Assessment failure";
}

export function assessmentFailureStorageKey(projectId: string, decisionId: string): string {
  return `ablearc:assessment-failure:${encodeURIComponent(projectId)}:${encodeURIComponent(decisionId)}`;
}
