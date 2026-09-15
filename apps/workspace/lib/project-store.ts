import fs from "node:fs";
import path from "node:path";

export type StorageLayout = "legacy-v0.1" | "workspace-v0.2";

export interface ProjectReadContext {
  layout: StorageLayout;
  projectId: string;
  missionId?: string;
  learnerPath: string;
  missionMarkdownPath?: string;
  roadmapMarkdownPath: string;
  statePath: string;
  runtimeRoot: string;
  artifactsRoot: string;
}

const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const WORKSPACE_ID = /^ws_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const LEGACY_MARKERS = ["MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md", "runtime", "artifacts"];

function readObject(filePath: string, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`Cannot read valid ${label}: ${filePath}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object: ${filePath}`);
  }
  return value as Record<string, unknown>;
}

function localId(value: unknown, field: string, optional = false): string | undefined {
  if (value === null && optional) return undefined;
  if (typeof value !== "string" || !LOCAL_ID.test(value)) {
    throw new Error(`${field} is not a safe local identifier`);
  }
  return value;
}

export function resolveProjectReadContext(repoRoot: string): ProjectReadContext | undefined {
  const learningRoot = path.join(path.resolve(repoRoot), ".learning");
  const workspacePath = path.join(learningRoot, "workspace.json");

  if (!fs.existsSync(workspacePath)) {
    const legacy = fs.existsSync(learningRoot)
      && LEGACY_MARKERS.some((name) => fs.existsSync(path.join(learningRoot, name)));
    if (!legacy) return undefined;
    const missionPath = path.join(learningRoot, "MISSION.md");
    return {
      layout: "legacy-v0.1",
      projectId: "legacy-v0-1",
      missionId: fs.existsSync(missionPath) ? "legacy-mission" : undefined,
      learnerPath: path.join(learningRoot, "LEARNER.md"),
      missionMarkdownPath: fs.existsSync(missionPath) ? missionPath : undefined,
      roadmapMarkdownPath: path.join(learningRoot, "ROADMAP.md"),
      statePath: path.join(learningRoot, "STATE.md"),
      runtimeRoot: path.join(learningRoot, "runtime"),
      artifactsRoot: path.join(learningRoot, "artifacts"),
    };
  }

  const workspace = readObject(workspacePath, "workspace manifest");
  if (workspace.schema_version !== "0.2" || typeof workspace.id !== "string" || !WORKSPACE_ID.test(workspace.id)) {
    throw new Error("Unsupported or invalid workspace manifest");
  }
  const projectId = localId(workspace.active_project_id, "active_project_id");
  const projectRoot = path.join(learningRoot, "projects", projectId!);
  const project = readObject(path.join(projectRoot, "project.json"), "project manifest");
  if (project.schema_version !== "0.2" || project.id !== projectId) {
    throw new Error("Project manifest identity does not match its directory");
  }
  const missionId = localId(project.active_mission_id, "active_mission_id", true);
  let missionMarkdownPath: string | undefined;
  if (missionId) {
    const missionRoot = path.join(projectRoot, "missions", missionId);
    const mission = readObject(path.join(missionRoot, "mission.json"), "mission manifest");
    if (mission.schema_version !== "0.2" || mission.id !== missionId || mission.project_id !== projectId) {
      throw new Error("Mission manifest identity does not match its project");
    }
    const candidate = path.join(missionRoot, "MISSION.md");
    missionMarkdownPath = fs.existsSync(candidate) ? candidate : undefined;
  }

  return {
    layout: "workspace-v0.2",
    projectId: projectId!,
    missionId,
    learnerPath: path.join(learningRoot, "LEARNER.md"),
    missionMarkdownPath,
    roadmapMarkdownPath: path.join(projectRoot, "map", "ROADMAP.md"),
    statePath: path.join(projectRoot, "STATE.md"),
    runtimeRoot: path.join(projectRoot, "runtime"),
    artifactsRoot: path.join(projectRoot, "artifacts"),
  };
}

