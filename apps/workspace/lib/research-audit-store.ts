import fs from "node:fs";
import path from "node:path";
import type { ResearchInvocation, ResearchResult } from "./research-capability";

export interface ResearchAuditRecord {
  schemaVersion: "0.1";
  kind: "research-capability-audit";
  invocationId: string;
  projectId: string;
  missionId: string;
  purpose: string;
  mode: ResearchInvocation["input"]["mode"];
  query: string;
  claim?: string;
  hostId: string;
  createdAt: string;
  completedAt: string;
  referenceIds: string[];
  referenceLabels: string[];
  resultStatus: ResearchResult["status"];
  sourceRefs: string[];
  unresolvedReferenceIds: string[];
  requestedHostCapability?: string;
  warnings: string[];
  outputSummary?: string;
}

const INVOCATION_ID = /^capi_[A-Za-z0-9_-]{8,64}$/;
const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function assertNoSymlink(target: string, label: string): void {
  try {
    if (fs.lstatSync(target).isSymbolicLink()) {
      throw new Error(`${label} must not be a symbolic link.`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function text(value: string, label: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new Error(`${label} must be 1-${maximum} characters.`);
  }
  return normalized;
}

export function createResearchAuditRecord(
  invocation: ResearchInvocation,
  result: ResearchResult,
): ResearchAuditRecord {
  if (
    !INVOCATION_ID.test(invocation.id)
    || result.invocationId !== invocation.id
    || !LOCAL_ID.test(invocation.projectId)
    || !LOCAL_ID.test(invocation.missionId)
  ) {
    throw new Error("Research audit scope is invalid.");
  }
  const referenceIds = invocation.input.references.map((reference) => reference.id);
  const referenceLabels = invocation.input.references
    .map((reference) => reference.label?.trim())
    .filter((label): label is string => Boolean(label));

  return {
    schemaVersion: "0.1",
    kind: "research-capability-audit",
    invocationId: invocation.id,
    projectId: invocation.projectId,
    missionId: invocation.missionId,
    purpose: text(invocation.purpose, "Research purpose", 1200),
    mode: invocation.input.mode,
    query: text(invocation.input.query, "Research query", 1600),
    ...(invocation.input.claim
      ? { claim: text(invocation.input.claim, "Research claim", 1800) }
      : {}),
    hostId: text(invocation.hostId, "Research host id", 128),
    createdAt: invocation.createdAt,
    completedAt: result.completedAt,
    referenceIds,
    referenceLabels,
    resultStatus: result.status,
    sourceRefs: [...result.sourceRefs],
    unresolvedReferenceIds: [...result.unresolvedReferenceIds],
    ...(result.requestedHostCapability
      ? { requestedHostCapability: result.requestedHostCapability }
      : {}),
    warnings: [...result.warnings],
    ...(result.output?.summary
      ? { outputSummary: text(result.output.summary, "Research output summary", 1800) }
      : {}),
  };
}

export function writeResearchAuditRecord(
  auditRoot: string,
  record: ResearchAuditRecord,
): string {
  if (!INVOCATION_ID.test(record.invocationId)) {
    throw new Error("Research audit invocation id is invalid.");
  }
  const root = path.resolve(auditRoot);
  assertNoSymlink(root, "Research audit directory");
  fs.mkdirSync(root, { recursive: true });
  assertNoSymlink(root, "Research audit directory");

  const target = path.join(root, `${record.invocationId}.json`);
  assertNoSymlink(target, "Research audit record");
  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target, "utf8");
    const next = JSON.stringify(record, null, 2) + "\n";
    if (existing === next) return target;
    throw new Error("Research audit record is immutable.");
  }

  const temporary = path.join(
    root,
    `.${record.invocationId}.${process.pid}.tmp`,
  );
  fs.writeFileSync(temporary, JSON.stringify(record, null, 2) + "\n", "utf8");
  fs.renameSync(temporary, target);
  return target;
}
