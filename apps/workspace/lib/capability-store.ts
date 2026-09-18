import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  CapabilityInvocation,
  CapabilitySource,
  CapabilitySourceAudit,
  CapabilityTrace,
  ResearchCapabilityRequest,
} from "./capability.ts";
import type { ResearchCapabilityResult } from "./research-capability.ts";
import { resolveProjectReadContext, type ProjectReadContext } from "./project-store.ts";

const INVOCATION_ID = /^capinv_[a-f0-9]{16}$/;
const DECISION_ID = /^dec_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const MAX_TRACES = 1000;

type SelectedContext = ProjectReadContext & {
  workspaceId: string;
  missionId: string;
};

export type ResearchCapabilityTrace = CapabilityTrace<ResearchCapabilityResult>;

function selectedContext(repoRoot: string): SelectedContext {
  const context = resolveProjectReadContext(repoRoot);
  if (
    !context
    || context.layout !== "workspace-v0.2"
    || !context.workspaceId
    || !context.missionId
  ) {
    throw new Error("Capability invocation requires an active workspace-v0.2 Project and Mission");
  }
  return context as SelectedContext;
}

function traceRoot(context: ProjectReadContext): string {
  return path.join(path.dirname(context.runtimeRoot), "capabilities", "invocations");
}

function tracePath(context: ProjectReadContext, id: string): string {
  if (!INVOCATION_ID.test(id)) throw new Error("Capability invocation id is invalid");
  return path.join(traceRoot(context), id + ".json");
}

function assertDecision(context: SelectedContext, decisionId: string): void {
  if (!DECISION_ID.test(decisionId)) throw new Error("Capability Decision id is invalid");
  const filePath = path.join(context.runtimeRoot, "receipts", "decisions", decisionId + ".json");
  if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error("Capability Decision does not exist safely");
  }
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    throw new Error("Capability Decision is not valid JSON");
  }
  if (
    value.id !== decisionId
    || value.project_id !== context.projectId
    || value.mission_id !== context.missionId
  ) {
    throw new Error("Capability Decision is outside the active Project/Mission");
  }
}

function sourceAudit(source: CapabilitySource): CapabilitySourceAudit {
  return {
    id: source.id,
    kind: source.kind,
    label: source.label,
    ...(source.locator ? { locator: source.locator } : {}),
    ...(source.mediaType ? { mediaType: source.mediaType } : {}),
    excerptSha256: crypto.createHash("sha256").update(source.excerpt, "utf8").digest("hex"),
  };
}

function parseTrace(value: unknown, context: SelectedContext): ResearchCapabilityTrace {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Capability trace must be an object");
  }
  const root = value as Record<string, unknown>;
  if (
    root.schema_version !== "0.1"
    || root.kind !== "capability-trace"
    || root.capability !== "research"
    || typeof root.id !== "string"
    || !INVOCATION_ID.test(root.id)
    || root.workspace_id !== context.workspaceId
    || root.project_id !== context.projectId
    || typeof root.mission_id !== "string"
    || typeof root.decision_id !== "string"
    || !DECISION_ID.test(root.decision_id)
    || typeof root.purpose !== "string"
    || !root.purpose.trim()
    || typeof root.query !== "string"
    || !root.query.trim()
    || !Array.isArray(root.sources)
    || typeof root.result !== "object"
    || root.result === null
    || Array.isArray(root.result)
    || typeof root.created_at !== "string"
    || Number.isNaN(Date.parse(root.created_at))
    || typeof root.completed_at !== "string"
    || Number.isNaN(Date.parse(root.completed_at))
  ) {
    throw new Error("Capability trace identity or scope is invalid");
  }
  if (root.mission_id !== context.missionId) {
    throw new Error("Capability trace belongs to a different active Mission");
  }
  const sources = root.sources as CapabilitySourceAudit[];
  if (sources.length > 12 || sources.some((source) => (
    !source
    || typeof source.id !== "string"
    || typeof source.label !== "string"
    || typeof source.excerptSha256 !== "string"
    || !/^[a-f0-9]{64}$/.test(source.excerptSha256)
  ))) {
    throw new Error("Capability trace source audit is invalid");
  }
  const result = root.result as unknown as ResearchCapabilityResult;
  if (
    typeof result.summary !== "string"
    || !Array.isArray(result.findings)
    || !Array.isArray(result.unresolved)
    || !Array.isArray(result.sourcesUsed)
  ) {
    throw new Error("Capability trace result is invalid");
  }
  const invocation: CapabilityInvocation = {
    schemaVersion: "0.1",
    id: root.id,
    capability: "research",
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    missionId: context.missionId,
    decisionId: root.decision_id,
    purpose: root.purpose.trim(),
    query: root.query.trim(),
    sourceIds: sources.map((source) => source.id),
    createdAt: root.created_at,
  };
  return {
    schemaVersion: "0.1",
    kind: "capability-trace",
    invocation,
    sources,
    result,
    completedAt: root.completed_at,
  };
}

export function writeResearchCapabilityTrace(
  repoRoot: string,
  request: ResearchCapabilityRequest,
  result: ResearchCapabilityResult,
): ResearchCapabilityTrace {
  const context = selectedContext(repoRoot);
  if (context.projectId !== request.expectedProjectId) {
    throw new Error("selected Project changed before capability invocation completed");
  }
  assertDecision(context, request.decisionId);
  const root = traceRoot(context);
  if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()) {
    throw new Error("Capability trace directory must not be a symbolic link");
  }
  fs.mkdirSync(root, { recursive: true });

  const id = "capinv_" + crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const now = new Date().toISOString();
  const sources = request.sources.map(sourceAudit);
  const payload = {
    schema_version: "0.1",
    kind: "capability-trace",
    capability: "research",
    id,
    workspace_id: context.workspaceId,
    project_id: context.projectId,
    mission_id: context.missionId,
    decision_id: request.decisionId,
    purpose: request.purpose,
    query: request.query,
    sources,
    result,
    created_at: now,
    completed_at: now,
  };
  const target = tracePath(context, id);
  if (fs.existsSync(target)) throw new Error("Capability trace already exists");
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  return parseTrace(payload, context);
}

export function listResearchCapabilityTraces(repoRoot: string): ResearchCapabilityTrace[] {
  const context = selectedContext(repoRoot);
  const root = traceRoot(context);
  if (!fs.existsSync(root)) return [];
  if (fs.lstatSync(root).isSymbolicLink()) {
    throw new Error("Capability trace directory must not be a symbolic link");
  }
  const files = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^capinv_[a-f0-9]{16}\.json$/.test(entry.name));
  if (files.length > MAX_TRACES) throw new Error("Capability trace storage is too large to inspect safely");
  return files
    .map((entry) => {
      const filePath = path.join(root, entry.name);
      if (fs.lstatSync(filePath).isSymbolicLink()) {
        throw new Error("Capability trace must not be a symbolic link");
      }
      return parseTrace(JSON.parse(fs.readFileSync(filePath, "utf8")), context);
    })
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

export function latestResearchCapabilityTrace(
  repoRoot: string,
  decisionId: string,
): ResearchCapabilityTrace | undefined {
  if (!DECISION_ID.test(decisionId)) return undefined;
  return listResearchCapabilityTraces(repoRoot)
    .find((trace) => trace.invocation.decisionId === decisionId);
}
