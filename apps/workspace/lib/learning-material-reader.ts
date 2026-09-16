import fs from "node:fs";
import path from "node:path";
import { isLearningMaterialId, parseLearningMaterialDetail, type LearningMaterialDetail } from "./learning-material-data.ts";
import { resolveProjectReadContext } from "./project-store.ts";

function readObject(filePath: string, label: string): Record<string, unknown> {
  if (fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error(`${label} must not be a symbolic link`);
  }
  const value = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

export function readLearningMaterialDetail(repoRoot: string, materialId: string): LearningMaterialDetail {
  if (!isLearningMaterialId(materialId)) {
    throw new Error("LearningMaterial id is invalid");
  }
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2" || !context.workspaceId) {
    throw new Error("LearningMaterial detail requires a selected workspace Project");
  }
  if (!fs.existsSync(context.materialsRoot) || fs.lstatSync(context.materialsRoot).isSymbolicLink()) {
    throw new Error("Project materials directory is unavailable");
  }

  const materialPath = path.join(context.materialsRoot, `${materialId}.json`);
  if (!fs.existsSync(materialPath)) {
    throw new Error("LearningMaterial was not found in the selected Project");
  }
  const material = parseLearningMaterialDetail(
    readObject(materialPath, "LearningMaterial"),
    context.workspaceId,
    context.projectId,
  );
  if (material.id !== materialId) {
    throw new Error("LearningMaterial filename does not match its identity");
  }

  const projectRoot = path.dirname(context.materialsRoot);
  const missionRoot = path.join(projectRoot, "missions", material.missionId);
  const missionPath = path.join(missionRoot, "mission.json");
  if (!fs.existsSync(missionPath) || fs.lstatSync(missionRoot).isSymbolicLink()) {
    throw new Error("LearningMaterial Mission scope is unavailable");
  }
  const mission = readObject(missionPath, "Mission manifest");
  if (
    mission.schema_version !== "0.2"
    || mission.id !== material.missionId
    || mission.project_id !== context.projectId
  ) {
    throw new Error("LearningMaterial Mission scope is invalid");
  }

  const evidenceRoot = path.join(context.runtimeRoot, "receipts", "evidence");
  for (const evidenceId of material.evidenceIds) {
    const evidencePath = path.join(evidenceRoot, `${evidenceId}.json`);
    if (!fs.existsSync(evidencePath)) {
      throw new Error(`LearningMaterial Evidence is missing: ${evidenceId}`);
    }
    const evidence = readObject(evidencePath, "Runtime Evidence");
    if (
      evidence.id !== evidenceId
      || evidence.workspace_id !== context.workspaceId
      || evidence.project_id !== context.projectId
      || evidence.mission_id !== material.missionId
    ) {
      throw new Error("LearningMaterial Evidence provenance is invalid");
    }
  }
  return material;
}
