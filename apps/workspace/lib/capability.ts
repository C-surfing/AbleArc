export type CapabilityKind = "research";

export const CAPABILITY_AUTHORITY = {
  createObservation: false,
  createEvidence: false,
  changeMastery: false,
  reviseMap: false,
  completeMission: false,
} as const;

export interface CapabilitySource {
  id: string;
  kind: "text" | "url" | "file";
  label: string;
  locator?: string;
  excerpt: string;
  mediaType?: string;
}

export interface CapabilityInvocation {
  schemaVersion: "0.1";
  id: string;
  capability: CapabilityKind;
  workspaceId: string;
  projectId: string;
  missionId: string;
  decisionId: string;
  purpose: string;
  query: string;
  sourceIds: string[];
  createdAt: string;
}

export interface CapabilitySourceAudit {
  id: string;
  kind: CapabilitySource["kind"];
  label: string;
  locator?: string;
  mediaType?: string;
  excerptSha256: string;
}

export interface CapabilityTrace<Result> {
  schemaVersion: "0.1";
  kind: "capability-trace";
  invocation: CapabilityInvocation;
  sources: CapabilitySourceAudit[];
  result: Result;
  completedAt: string;
}

export interface ResearchCapabilityRequest {
  expectedProjectId: string;
  decisionId: string;
  purpose: string;
  query: string;
  sources: CapabilitySource[];
}

const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const DECISION_ID = /^dec_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const SOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  const accepted = new Set(allowed);
  if (Object.keys(value).some((key) => !accepted.has(key))) {
    throw new Error(label + " contains unsupported fields");
  }
}

function text(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new Error(label + " must be non-empty text of at most " + maximum + " characters");
  }
  return value.trim();
}

function optionalText(value: unknown, label: string, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  return text(value, label, maximum);
}

function source(value: unknown, index: number): CapabilitySource {
  const item = object(value, "sources[" + index + "]");
  exactKeys(item, ["id", "kind", "label", "locator", "excerpt", "mediaType"], "sources[" + index + "]");
  const id = text(item.id, "sources[" + index + "].id", 128);
  if (!SOURCE_ID.test(id)) throw new Error("sources[" + index + "].id is invalid");
  if (item.kind !== "text" && item.kind !== "url" && item.kind !== "file") {
    throw new Error("sources[" + index + "].kind is invalid");
  }
  return {
    id,
    kind: item.kind,
    label: text(item.label, "sources[" + index + "].label", 240),
    ...(optionalText(item.locator, "sources[" + index + "].locator", 2000)
      ? { locator: optionalText(item.locator, "sources[" + index + "].locator", 2000) }
      : {}),
    excerpt: text(item.excerpt, "sources[" + index + "].excerpt", 12000),
    ...(optionalText(item.mediaType, "sources[" + index + "].mediaType", 120)
      ? { mediaType: optionalText(item.mediaType, "sources[" + index + "].mediaType", 120) }
      : {}),
  };
}

export function parseResearchCapabilityRequest(value: unknown): ResearchCapabilityRequest {
  const root = object(value, "Research capability request");
  exactKeys(root, ["expectedProjectId", "decisionId", "purpose", "query", "sources"], "Research capability request");
  const expectedProjectId = text(root.expectedProjectId, "expectedProjectId", 64);
  if (!LOCAL_ID.test(expectedProjectId)) throw new Error("expectedProjectId is invalid");
  const decisionId = text(root.decisionId, "decisionId", 131);
  if (!DECISION_ID.test(decisionId)) throw new Error("decisionId is invalid");
  if (!Array.isArray(root.sources) || root.sources.length < 1 || root.sources.length > 12) {
    throw new Error("sources must contain 1 to 12 source excerpts");
  }
  const sources = root.sources.map(source);
  if (new Set(sources.map((item) => item.id)).size !== sources.length) {
    throw new Error("source ids must be unique");
  }
  return {
    expectedProjectId,
    decisionId,
    purpose: text(root.purpose, "purpose", 800),
    query: text(root.query, "query", 1200),
    sources,
  };
}
