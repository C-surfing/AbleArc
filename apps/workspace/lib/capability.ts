export type CapabilityKind = "research";
export type CapabilityStatus = "completed" | "needs_host_action";

export interface CapabilityInvocation<TInput> {
  schemaVersion: "0.1";
  id: string;
  capability: CapabilityKind;
  projectId: string;
  missionId: string;
  purpose: string;
  hostId: string;
  createdAt: string;
  input: TInput;
}

export interface CapabilityResult<TOutput> {
  schemaVersion: "0.1";
  invocationId: string;
  capability: CapabilityKind;
  status: CapabilityStatus;
  completedAt: string;
  sourceRefs: string[];
  unresolvedReferenceIds: string[];
  warnings: string[];
  requestedHostCapability?: string;
  output?: TOutput;
}
