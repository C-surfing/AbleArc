import fs from "node:fs";
import path from "node:path";
import { isContextScale, normalizeDailyContextUpdate, type DailyContext } from "./daily-context.ts";
import {
  assertNotSymlink,
  atomicWriteJson,
  withExclusiveFileLock,
} from "./local-file-store.ts";
import { resolveProjectReadContext } from "./project-store.ts";

const MANIFEST_FIELDS = new Set([
  "schema_version",
  "kind",
  "workspace_id",
  "revision",
  "energy",
  "available_minutes",
  "focus",
  "note",
  "updated_at",
]);
const WORKSPACE_ID = /^ws_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;

function workspaceId(repoRoot: string): string | undefined {
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2" || !context.workspaceId) return undefined;
  if (!WORKSPACE_ID.test(context.workspaceId)) throw new Error("Workspace identity is invalid");
  return context.workspaceId;
}

export function dailyContextFilePath(repoRoot: string): string {
  return path.join(path.resolve(repoRoot), ".learning", "context", "daily.json");
}

function parseManifest(input: unknown, expectedWorkspaceId: string): DailyContext {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("DailyContext manifest must be an object");
  }
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !MANIFEST_FIELDS.has(key))) {
    throw new Error("DailyContext manifest contains unsupported fields");
  }
  if (
    value.schema_version !== "0.1"
    || value.kind !== "daily-context"
    || value.workspace_id !== expectedWorkspaceId
    || !Number.isSafeInteger(value.revision)
    || Number(value.revision) < 1
    || !isContextScale(value.energy)
    || typeof value.updated_at !== "string"
    || Number.isNaN(Date.parse(value.updated_at))
  ) {
    throw new Error("DailyContext manifest is invalid");
  }

  const update = normalizeDailyContextUpdate({
    expectedRevision: Number(value.revision) - 1,
    energy: value.energy,
    availableMinutes: value.available_minutes,
    focus: value.focus,
    note: value.note,
  });

  return {
    schemaVersion: "0.1",
    revision: Number(value.revision),
    energy: update.energy,
    ...(update.availableMinutes ? { availableMinutes: update.availableMinutes } : {}),
    ...(update.focus ? { focus: update.focus } : {}),
    ...(update.note ? { note: update.note } : {}),
    updatedAt: value.updated_at,
  };
}

export function readDailyContext(repoRoot: string): DailyContext | undefined {
  const id = workspaceId(repoRoot);
  if (!id) return undefined;
  const filePath = dailyContextFilePath(repoRoot);
  const root = path.dirname(filePath);
  if (!fs.existsSync(filePath)) {
    assertNotSymlink(root, "DailyContext directory");
    return undefined;
  }
  assertNotSymlink(path.join(path.resolve(repoRoot), ".learning"), ".learning");
  assertNotSymlink(root, "DailyContext directory");
  assertNotSymlink(filePath, "DailyContext manifest");
  let input: unknown;
  try {
    input = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("DailyContext manifest is not valid JSON");
  }
  return parseManifest(input, id);
}

function withContextLock<T>(repoRoot: string, operation: () => T): T {
  const learningRoot = path.join(path.resolve(repoRoot), ".learning");
  assertNotSymlink(learningRoot, ".learning");
  return withExclusiveFileLock(
    path.join(learningRoot, ".daily-context.lock"),
    "another DailyContext write is already in progress",
    operation,
  );
}

export function writeDailyContext(repoRoot: string, input: unknown): DailyContext {
  const update = normalizeDailyContextUpdate(input);
  return withContextLock(repoRoot, () => {
    const id = workspaceId(repoRoot);
    if (!id) throw new Error("DailyContext requires a workspace-v0.2 Project");
    const current = readDailyContext(repoRoot);
    const revision = current?.revision ?? 0;
    if (revision !== update.expectedRevision) {
      throw new Error("DailyContext changed before this update was saved");
    }

    const next: DailyContext = {
      schemaVersion: "0.1",
      revision: revision + 1,
      energy: update.energy,
      ...(update.availableMinutes ? { availableMinutes: update.availableMinutes } : {}),
      ...(update.focus ? { focus: update.focus } : {}),
      ...(update.note ? { note: update.note } : {}),
      updatedAt: new Date().toISOString(),
    };

    const filePath = dailyContextFilePath(repoRoot);
    atomicWriteJson(
      filePath,
      {
        schema_version: next.schemaVersion,
        kind: "daily-context",
        workspace_id: id,
        revision: next.revision,
        energy: next.energy,
        ...(next.availableMinutes ? { available_minutes: next.availableMinutes } : {}),
        ...(next.focus ? { focus: next.focus } : {}),
        ...(next.note ? { note: next.note } : {}),
        updated_at: next.updatedAt,
      },
      {
        directoryLabel: "DailyContext directory",
        targetLabel: "DailyContext manifest",
        temporaryPrefix: ".daily",
      },
    );
    return next;
  });
}
