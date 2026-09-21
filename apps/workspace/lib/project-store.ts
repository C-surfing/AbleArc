import fs from "node:fs";
import path from "node:path";
import type { MaintenanceStatus, ProjectStatus, ProjectSummary } from "./types";

export type StorageLayout = "legacy-v0.1" | "workspace-v0.2";

export interface ProjectReadContext {
  layout: StorageLayout;
  workspaceId?: string;
  projectId: string;
  projectTitle: string;
  projectStatus: ProjectStatus;
  maintenanceStatus: MaintenanceStatus;
  missionId?: string;
  learnerPath: string;
  missionMarkdownPath?: string;
  learningMapPath?: string;
  roadmapMarkdownPath: string;
  statePath: string;
  runtimeRoot: string;
  artifactsRoot: string;
  materialsRoot: string;
}

const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const WORKSPACE_ID = /^ws_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const LEGACY_MARKERS = ["MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md", "runtime", "artifacts"];

function assertNotSymbolicLink(targetPath: string, label: string): void {
  try {
    if (fs.lstatSync(targetPath).isSymbolicLink()) {
      throw new Error(`${label} must not be a symbolic link: ${targetPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function readObject(filePath: string, label: string): Record<string, unknown> {
  assertNotSymbolicLink(filePath, label);
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

function projectStatus(value: unknown): ProjectStatus {
  if (value !== "active" && value !== "paused" && value !== "archived" && value !== "abandoned") {
    throw new Error("Project manifest status is invalid");
  }
  return value;
}

function maintenanceStatus(value: unknown): MaintenanceStatus {
  if (value !== "none" && value !== "scheduled" && value !== "due" && value !== "study_active") {
    throw new Error("Project manifest maintenance_status is invalid");
  }
  return value;
}

function readWorkspace(learningRoot: string): Record<string, unknown> {
  assertNotSymbolicLink(learningRoot, ".learning");
  const workspace = readObject(path.join(learningRoot, "workspace.json"), "workspace manifest");
  if (
    workspace.schema_version !== "0.2"
    || typeof workspace.id !== "string"
    || !WORKSPACE_ID.test(workspace.id)
  ) {
    throw new Error("Unsupported or invalid workspace manifest");
  }
  localId(workspace.active_project_id, "active_project_id", true);
  return workspace;
}

function readProjectSummary(
  learningRoot: string,
  projectId: string,
  selected: boolean,
): ProjectSummary {
  const projectRoot = path.join(learningRoot, "projects", projectId);
  assertNotSymbolicLink(projectRoot, "Project directory");
  const project = readObject(path.join(projectRoot, "project.json"), "project manifest");
  if (
    project.schema_version !== "0.2"
    || project.id !== projectId
    || typeof project.title !== "string"
    || !project.title.trim()
  ) {
    throw new Error("Project manifest identity or title is invalid");
  }
  return {
    id: projectId,
    title: project.title,
    status: projectStatus(project.status),
    maintenanceStatus: maintenanceStatus(project.maintenance_status),
    missionId: localId(project.active_mission_id, "active_mission_id", true),
    selected,
  };
}

export function listProjectSummaries(repoRoot: string): ProjectSummary[] {
  const learningRoot = path.join(path.resolve(repoRoot), ".learning");
  const workspacePath = path.join(learningRoot, "workspace.json");
  if (!fs.existsSync(workspacePath)) return [];
  const workspace = readWorkspace(learningRoot);
  const selectedId = localId(workspace.active_project_id, "active_project_id", true);
  const projectsRoot = path.join(learningRoot, "projects");
  assertNotSymbolicLink(projectsRoot, "Projects directory");
  if (!fs.existsSync(projectsRoot)) return [];
  return fs.readdirSync(projectsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => {
      const id = localId(entry.name, "project_id")!;
      return readProjectSummary(learningRoot, id, id === selectedId);
    })
    .sort((left, right) => (
      Number(right.selected) - Number(left.selected)
      || ({ active: 0, paused: 1, archived: 2, abandoned: 3 }[left.status] - { active: 0, paused: 1, archived: 2, abandoned: 3 }[right.status])
      || left.title.localeCompare(right.title)
    ));
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
  assertNotSymbolicLink(learningRoot, ".learning");
  const workspacePath = path.join(learningRoot, "workspace.json");

  if (!fs.existsSync(workspacePath)) {
    const legacy = fs.existsSync(learningRoot)
      && LEGACY_MARKERS.some((name) => fs.existsSync(path.join(learningRoot, name)));
    if (!legacy) return undefined;
    const missionPath = path.join(learningRoot, "MISSION.md");
    return {
      layout: "legacy-v0.1",
      projectId: "legacy-v0-1",
      projectTitle: "Legacy learning workspace",
      projectStatus: "active",
      maintenanceStatus: "none",
      missionId: fs.existsSync(missionPath) ? "legacy-mission" : undefined,
      learnerPath: path.join(learningRoot, "LEARNER.md"),
      missionMarkdownPath: fs.existsSync(missionPath) ? missionPath : undefined,
      learningMapPath: undefined,
      roadmapMarkdownPath: path.join(learningRoot, "ROADMAP.md"),
      statePath: path.join(learningRoot, "STATE.md"),
      runtimeRoot: path.join(learningRoot, "runtime"),
      artifactsRoot: path.join(learningRoot, "artifacts"),
      materialsRoot: path.join(learningRoot, "references"),
    };
  }

  const workspace = readWorkspace(learningRoot);
  const projectId = localId(workspace.active_project_id, "active_project_id", true);
  if (!projectId) return undefined;
  const projectRoot = path.join(learningRoot, "projects", projectId);
  const summary = readProjectSummary(learningRoot, projectId, true);
  const missionId = summary.missionId;
  let missionMarkdownPath: string | undefined;
  if (missionId) {
    const missionRoot = path.join(projectRoot, "missions", missionId);
    assertNotSymbolicLink(missionRoot, "Mission directory");
    const mission = readObject(path.join(missionRoot, "mission.json"), "mission manifest");
    if (mission.schema_version !== "0.2" || mission.id !== missionId || mission.project_id !== projectId) {
      throw new Error("Mission manifest identity does not match its project");
    }
    const candidate = path.join(missionRoot, "MISSION.md");
    missionMarkdownPath = fs.existsSync(candidate) ? candidate : undefined;
  }

  return {
    layout: "workspace-v0.2",
    workspaceId: String(workspace.id),
    projectId: projectId,
    projectTitle: summary.title,
    projectStatus: summary.status,
    maintenanceStatus: summary.maintenanceStatus,
    missionId,
    learnerPath: path.join(learningRoot, "LEARNER.md"),
    missionMarkdownPath,
    learningMapPath: path.join(projectRoot, "map", "current.json"),
    roadmapMarkdownPath: path.join(projectRoot, "map", "ROADMAP.md"),
    statePath: path.join(projectRoot, "STATE.md"),
    runtimeRoot: path.join(projectRoot, "runtime"),
    artifactsRoot: path.join(projectRoot, "artifacts"),
    materialsRoot: path.join(projectRoot, "materials"),
  };
}
