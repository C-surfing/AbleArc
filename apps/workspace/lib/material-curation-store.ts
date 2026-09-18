import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson, withExclusiveFileLock } from "./local-file-store.ts";
import { isLearningMaterialId } from "./learning-material-data.ts";
import { readLearningMaterialDetail } from "./learning-material-reader.ts";
import { resolveProjectReadContext, type ProjectReadContext } from "./project-store.ts";

const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const MAX_SELECTED_MATERIALS = 500;
const FIELDS = new Set([
  "schema_version",
  "kind",
  "workspace_id",
  "project_id",
  "revision",
  "selected_material_ids",
  "updated_at",
]);

export interface MaterialCurationView {
  projectId: string;
  revision: number;
  selectedMaterialIds: string[];
  updatedAt?: string;
}

export interface MaterialCurationUpdate {
  expectedProjectId: string;
  expectedRevision: number;
  materialId: string;
  selected: boolean;
}

function selectedContext(repoRoot: string): ProjectReadContext & { workspaceId: string } {
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2" || !context.workspaceId) {
    throw new Error("Material curation requires a selected workspace Project");
  }
  return context as ProjectReadContext & { workspaceId: string };
}

function curationPath(context: ProjectReadContext): string {
  return path.join(path.dirname(context.materialsRoot), "curation", "materials.json");
}

function parseManifest(
  input: unknown,
  expectedWorkspaceId: string,
  expectedProjectId: string,
): MaterialCurationView {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Material curation manifest must be an object");
  }
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== FIELDS.size || Object.keys(value).some((key) => !FIELDS.has(key))) {
    throw new Error("Material curation manifest fields are invalid");
  }
  if (
    value.schema_version !== "0.1"
    || value.kind !== "learning-material-curation"
    || value.workspace_id !== expectedWorkspaceId
    || value.project_id !== expectedProjectId
    || typeof value.revision !== "number"
    || !Number.isSafeInteger(value.revision)
    || value.revision < 1
    || !Array.isArray(value.selected_material_ids)
    || value.selected_material_ids.length > MAX_SELECTED_MATERIALS
    || value.selected_material_ids.some((item) => typeof item !== "string" || !isLearningMaterialId(item))
    || new Set(value.selected_material_ids).size !== value.selected_material_ids.length
    || typeof value.updated_at !== "string"
    || Number.isNaN(Date.parse(value.updated_at))
  ) {
    throw new Error("Material curation manifest is invalid");
  }
  return {
    projectId: expectedProjectId,
    revision: value.revision,
    selectedMaterialIds: [...value.selected_material_ids].sort(),
    updatedAt: value.updated_at,
  };
}

function readForContext(context: ProjectReadContext & { workspaceId: string }): MaterialCurationView {
  const filePath = curationPath(context);
  const root = path.dirname(filePath);
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()) {
      throw new Error("Material curation directory must not be a symbolic link");
    }
    return { projectId: context.projectId, revision: 0, selectedMaterialIds: [] };
  }
  if (fs.lstatSync(root).isSymbolicLink() || fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error("Material curation storage must not be a symbolic link");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("Material curation manifest is not valid JSON");
  }
  return parseManifest(raw, context.workspaceId, context.projectId);
}

export function readMaterialCuration(repoRoot: string): MaterialCurationView {
  return readForContext(selectedContext(repoRoot));
}

function withProjectWriteLock<T>(repoRoot: string, operation: () => T): T {
  const learningRoot = path.join(path.resolve(repoRoot), ".learning");
  return withExclusiveFileLock(
    path.join(learningRoot, ".project-lifecycle.lock"),
    "another Project lifecycle write is already in progress",
    operation,
  );
}

function writeManifest(
  context: ProjectReadContext & { workspaceId: string },
  value: MaterialCurationView,
): void {
  atomicWriteJson(
    curationPath(context),
    {
      schema_version: "0.1",
      kind: "learning-material-curation",
      workspace_id: context.workspaceId,
      project_id: context.projectId,
      revision: value.revision,
      selected_material_ids: value.selectedMaterialIds,
      updated_at: value.updatedAt,
    },
    {
      directoryLabel: "Material curation directory",
      targetLabel: "Material curation manifest",
      temporaryPrefix: ".materials",
    },
  );
}

export function setMaterialCuration(
  repoRoot: string,
  update: MaterialCurationUpdate,
): MaterialCurationView {
  if (!LOCAL_ID.test(update.expectedProjectId)) {
    throw new Error("Expected Project id is invalid");
  }
  if (!Number.isSafeInteger(update.expectedRevision) || update.expectedRevision < 0) {
    throw new Error("Expected material curation revision is invalid");
  }
  if (!isLearningMaterialId(update.materialId)) {
    throw new Error("LearningMaterial id is invalid");
  }
  if (typeof update.selected !== "boolean") {
    throw new Error("Material curation selection must be boolean");
  }

  return withProjectWriteLock(repoRoot, () => {
    const context = selectedContext(repoRoot);
    if (context.projectId !== update.expectedProjectId) {
      throw new Error("selected Project changed before material curation was saved");
    }
    const current = readForContext(context);
    if (current.revision !== update.expectedRevision) {
      throw new Error("material curation changed before this update was saved");
    }

    readLearningMaterialDetail(repoRoot, update.materialId);
    const selected = new Set(current.selectedMaterialIds);
    const alreadySelected = selected.has(update.materialId);
    if (alreadySelected === update.selected) return current;
    if (update.selected) selected.add(update.materialId);
    else selected.delete(update.materialId);
    if (selected.size > MAX_SELECTED_MATERIALS) {
      throw new Error(`Material curation cannot exceed ${MAX_SELECTED_MATERIALS} selections`);
    }

    const next: MaterialCurationView = {
      projectId: context.projectId,
      revision: current.revision + 1,
      selectedMaterialIds: [...selected].sort(),
      updatedAt: new Date().toISOString(),
    };
    writeManifest(context, next);
    return next;
  });
}
