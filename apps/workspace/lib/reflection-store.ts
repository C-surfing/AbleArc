import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isLearningMaterialId } from "./learning-material-data.ts";
import { readLearningMaterialDetail } from "./learning-material-reader.ts";
import { resolveProjectReadContext, type ProjectReadContext } from "./project-store.ts";
import type { ReflectionLinks, ReflectionRecord } from "./reflection.ts";

const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const REFLECTION_ID = /^ref_[a-f0-9]{16}$/;
const DECISION_ID = /^dec_[A-Za-z0-9_-]{4,127}$/;
const MAX_BODY = 20_000;
const MAX_LINKS = 30;
const MAX_REFLECTIONS = 1000;
const FIELDS = new Set([
  "schema_version",
  "kind",
  "id",
  "workspace_id",
  "project_id",
  "revision",
  "body",
  "links",
  "created_at",
  "updated_at",
]);
const LINK_FIELDS = new Set([
  "mission_id",
  "decision_id",
  "concept_ids",
  "material_ids",
]);

type SelectedContext = ProjectReadContext & { workspaceId: string };

function selectedContext(repoRoot: string): SelectedContext {
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2" || !context.workspaceId) {
    throw new Error("Reflection requires a selected workspace Project");
  }
  return context as SelectedContext;
}

function reflectionRoot(context: ProjectReadContext): string {
  return path.join(path.dirname(context.runtimeRoot), "reflections");
}

function reflectionPath(context: ProjectReadContext, reflectionId: string): string {
  if (!REFLECTION_ID.test(reflectionId)) throw new Error("Reflection id is invalid");
  return path.join(reflectionRoot(context), reflectionId + ".json");
}

function bodyText(value: unknown): string {
  if (typeof value !== "string") throw new Error("Reflection body must be text");
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_BODY) {
    throw new Error("Reflection body must contain 1 to " + MAX_BODY + " characters");
  }
  return normalized;
}

function stringIds(
  value: unknown,
  label: string,
  pattern: RegExp,
): string[] {
  if (!Array.isArray(value) || value.length > MAX_LINKS) {
    throw new Error("Reflection " + label + " are invalid");
  }
  const result = value.map((item) => {
    if (typeof item !== "string" || !pattern.test(item)) {
      throw new Error("Reflection " + label + " are invalid");
    }
    return item;
  });
  if (new Set(result).size !== result.length) {
    throw new Error("Reflection " + label + " must be unique");
  }
  return result;
}

function parseLinks(value: unknown): ReflectionLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Reflection links must be an object");
  }
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some((key) => !LINK_FIELDS.has(key))) {
    throw new Error("Reflection link fields are invalid");
  }
  const missionId = item.mission_id;
  const decisionId = item.decision_id;
  if (missionId !== undefined && (typeof missionId !== "string" || !LOCAL_ID.test(missionId))) {
    throw new Error("Reflection mission link is invalid");
  }
  if (decisionId !== undefined && (typeof decisionId !== "string" || !DECISION_ID.test(decisionId))) {
    throw new Error("Reflection Decision link is invalid");
  }
  return {
    ...(missionId ? { missionId } : {}),
    ...(decisionId ? { decisionId } : {}),
    conceptIds: stringIds(item.concept_ids ?? [], "concept links", LOCAL_ID),
    materialIds: stringIds(item.material_ids ?? [], "material links", /^mat_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/),
  };
}

function parseRecord(
  input: unknown,
  context: SelectedContext,
  expectedId?: string,
): ReflectionRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Reflection record must be an object");
  }
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== FIELDS.size || Object.keys(value).some((key) => !FIELDS.has(key))) {
    throw new Error("Reflection record fields are invalid");
  }
  if (
    value.schema_version !== "0.1"
    || value.kind !== "reflection"
    || typeof value.id !== "string"
    || !REFLECTION_ID.test(value.id)
    || (expectedId !== undefined && value.id !== expectedId)
    || value.workspace_id !== context.workspaceId
    || value.project_id !== context.projectId
    || typeof value.revision !== "number"
    || !Number.isSafeInteger(value.revision)
    || value.revision < 1
    || typeof value.created_at !== "string"
    || Number.isNaN(Date.parse(value.created_at))
    || typeof value.updated_at !== "string"
    || Number.isNaN(Date.parse(value.updated_at))
  ) {
    throw new Error("Reflection record identity, scope, or revision is invalid");
  }
  return {
    schemaVersion: "0.1",
    id: value.id,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    revision: value.revision,
    body: bodyText(value.body),
    links: parseLinks(value.links),
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function ensureRoot(context: ProjectReadContext): string {
  const root = reflectionRoot(context);
  if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()) {
    throw new Error("Reflection directory must not be a symbolic link");
  }
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function readForContext(context: SelectedContext, reflectionId: string): ReflectionRecord {
  const filePath = reflectionPath(context, reflectionId);
  const root = reflectionRoot(context);
  if (
    (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink())
    || !fs.existsSync(filePath)
    || fs.lstatSync(filePath).isSymbolicLink()
  ) {
    throw new Error("Reflection does not exist safely");
  }
  try {
    return parseRecord(JSON.parse(fs.readFileSync(filePath, "utf8")), context, reflectionId);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Reflection")) throw error;
    throw new Error("Reflection record is not valid JSON");
  }
}

export function readReflection(repoRoot: string, reflectionId: string): ReflectionRecord {
  return readForContext(selectedContext(repoRoot), reflectionId);
}

export function listReflections(repoRoot: string): ReflectionRecord[] {
  const context = selectedContext(repoRoot);
  const root = reflectionRoot(context);
  if (!fs.existsSync(root)) return [];
  if (fs.lstatSync(root).isSymbolicLink()) {
    throw new Error("Reflection directory must not be a symbolic link");
  }
  const files = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^ref_[a-f0-9]{16}\.json$/.test(entry.name));
  if (files.length > MAX_REFLECTIONS) {
    throw new Error("Reflection storage contains too many records to read safely");
  }
  return files
    .map((entry) => readForContext(context, entry.name.slice(0, -5)))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
}

function validateLinks(repoRoot: string, context: SelectedContext, links: ReflectionLinks): ReflectionLinks {
  if (links.missionId) {
    const missionPath = path.join(
      path.dirname(context.runtimeRoot),
      "missions",
      links.missionId,
      "mission.json",
    );
    if (!fs.existsSync(missionPath) || fs.lstatSync(missionPath).isSymbolicLink()) {
      throw new Error("Reflection Mission link does not exist");
    }
    const mission = JSON.parse(fs.readFileSync(missionPath, "utf8")) as Record<string, unknown>;
    if (mission.id !== links.missionId || mission.project_id !== context.projectId) {
      throw new Error("Reflection Mission link is outside the selected Project");
    }
  }
  if (links.decisionId) {
    const decisionPath = path.join(
      context.runtimeRoot,
      "receipts",
      "decisions",
      links.decisionId + ".json",
    );
    if (!fs.existsSync(decisionPath) || fs.lstatSync(decisionPath).isSymbolicLink()) {
      throw new Error("Reflection Decision link does not exist");
    }
  }
  const materialIds = links.materialIds.map((materialId) => {
    if (!isLearningMaterialId(materialId)) throw new Error("Reflection material link is invalid");
    readLearningMaterialDetail(repoRoot, materialId);
    return materialId;
  });
  if (links.conceptIds.length > MAX_LINKS || links.conceptIds.some((item) => !LOCAL_ID.test(item))) {
    throw new Error("Reflection concept links are invalid");
  }
  return {
    ...(links.missionId ? { missionId: links.missionId } : {}),
    ...(links.decisionId ? { decisionId: links.decisionId } : {}),
    conceptIds: [...new Set(links.conceptIds)],
    materialIds: [...new Set(materialIds)],
  };
}

function payload(record: ReflectionRecord) {
  return {
    schema_version: record.schemaVersion,
    kind: "reflection",
    id: record.id,
    workspace_id: record.workspaceId,
    project_id: record.projectId,
    revision: record.revision,
    body: record.body,
    links: {
      ...(record.links.missionId ? { mission_id: record.links.missionId } : {}),
      ...(record.links.decisionId ? { decision_id: record.links.decisionId } : {}),
      concept_ids: record.links.conceptIds,
      material_ids: record.links.materialIds,
    },
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function writeRecord(context: SelectedContext, record: ReflectionRecord, createOnly = false): void {
  const root = ensureRoot(context);
  const target = reflectionPath(context, record.id);
  const temporary = path.join(root, ".reflection." + crypto.randomUUID() + ".tmp");
  try {
    fs.writeFileSync(temporary, JSON.stringify(payload(record), null, 2) + "\n", "utf8");
    if (createOnly && fs.existsSync(target)) throw new Error("Reflection already exists");
    fs.renameSync(temporary, target);
  } finally {
    try { fs.unlinkSync(temporary); } catch {}
  }
}

function withReflectionLock<T>(context: SelectedContext, operation: () => T): T {
  const projectRoot = path.dirname(context.runtimeRoot);
  const lockPath = path.join(projectRoot, ".reflection.lock");
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(lockPath, "wx");
    fs.writeFileSync(descriptor, crypto.randomUUID() + "\n", "utf8");
    return operation();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("another Reflection write is already in progress");
    }
    throw error;
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
      try { fs.unlinkSync(lockPath); } catch {}
    }
  }
}

export function createReflection(
  repoRoot: string,
  body: string,
  links: ReflectionLinks,
  expectedProjectId: string,
): ReflectionRecord {
  const context = selectedContext(repoRoot);
  if (context.projectId !== expectedProjectId) {
    throw new Error("selected Project changed before Reflection was saved");
  }
  return withReflectionLock(context, () => {
    const now = new Date().toISOString();
    const record: ReflectionRecord = {
      schemaVersion: "0.1",
      id: "ref_" + crypto.randomUUID().replaceAll("-", "").slice(0, 16),
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      revision: 1,
      body: bodyText(body),
      links: validateLinks(repoRoot, context, links),
      createdAt: now,
      updatedAt: now,
    };
    writeRecord(context, record, true);
    return record;
  });
}

export function updateReflection(
  repoRoot: string,
  reflectionId: string,
  expectedRevision: number,
  body: string,
  links: ReflectionLinks,
  expectedProjectId: string,
): ReflectionRecord {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error("Reflection expected revision is invalid");
  }
  const context = selectedContext(repoRoot);
  if (context.projectId !== expectedProjectId) {
    throw new Error("selected Project changed before Reflection was saved");
  }
  return withReflectionLock(context, () => {
    const current = readForContext(context, reflectionId);
    if (current.revision !== expectedRevision) {
      throw new Error("Reflection changed before this update was saved");
    }
    const record: ReflectionRecord = {
      ...current,
      revision: current.revision + 1,
      body: bodyText(body),
      links: validateLinks(repoRoot, context, links),
      updatedAt: new Date().toISOString(),
    };
    writeRecord(context, record);
    return record;
  });
}

export function deleteReflection(
  repoRoot: string,
  reflectionId: string,
  expectedRevision: number,
  expectedProjectId: string,
): void {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error("Reflection expected revision is invalid");
  }
  const context = selectedContext(repoRoot);
  if (context.projectId !== expectedProjectId) {
    throw new Error("selected Project changed before Reflection was deleted");
  }
  withReflectionLock(context, () => {
    const current = readForContext(context, reflectionId);
    if (current.revision !== expectedRevision) {
      throw new Error("Reflection changed before deletion");
    }
    fs.unlinkSync(reflectionPath(context, reflectionId));
  });
}
