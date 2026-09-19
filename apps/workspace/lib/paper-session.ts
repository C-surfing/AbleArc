import fs from "node:fs";
import path from "node:path";
import type { CompletionGateStatus } from "./completion-status";
import { parseCompletionGateStatus } from "./completion-status";
import {
  PAPER_COMPLETION_CRITERION_IDS,
  createPaperCompletionCriteria,
  type PaperCompletionCriterionId,
} from "./paper-completion";
import type { PaperLearningPlan } from "./paper-learning";
import type { ProjectReadContext } from "./project-store";
import { runLocalLearningTool } from "./local-learning-tool";

const MAX_CONTEXT_BYTES = 128 * 1024;

export interface PersistedPaperLearningContext {
  schemaVersion: "0.1";
  projectId: string;
  missionId: string;
  generatedAt: string;
  plan: PaperLearningPlan;
}

export type PaperCompletionConfiguration =
  | { status: "configured" }
  | { status: "already_configured" }
  | { status: "custom_contract_preserved" };

function requireWorkspaceMission(context: ProjectReadContext): {
  projectId: string;
  missionId: string;
  root: string;
} {
  if (
    context.layout !== "workspace-v0.2"
    || !context.missionId
    || !context.missionMarkdownPath
  ) {
    throw new Error("Paper Learning context requires a workspace Mission.");
  }
  return {
    projectId: context.projectId,
    missionId: context.missionId,
    root: path.dirname(context.missionMarkdownPath),
  };
}

export function paperLearningContextPath(context: ProjectReadContext): string {
  return path.join(requireWorkspaceMission(context).root, "paper-learning.json");
}

export function writePaperLearningContext(
  context: ProjectReadContext,
  plan: PaperLearningPlan,
  generatedAt = new Date().toISOString(),
): PersistedPaperLearningContext {
  const scope = requireWorkspaceMission(context);
  const target = paperLearningContextPath(context);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
    throw new Error("Paper Learning context must not be a symbolic link.");
  }
  const record: PersistedPaperLearningContext = {
    schemaVersion: "0.1",
    projectId: scope.projectId,
    missionId: scope.missionId,
    generatedAt,
    plan,
  };
  const serialized = JSON.stringify(record, null, 2) + "\n";
  if (Buffer.byteLength(serialized, "utf8") > MAX_CONTEXT_BYTES) {
    throw new Error("Paper Learning context exceeds the persisted context budget.");
  }
  const temporary = target + "." + process.pid + ".tmp";
  fs.writeFileSync(temporary, serialized, "utf8");
  fs.renameSync(temporary, target);
  return record;
}

export function readPaperLearningContext(
  context: ProjectReadContext,
): PersistedPaperLearningContext | undefined {
  if (
    context.layout !== "workspace-v0.2"
    || !context.missionId
    || !context.missionMarkdownPath
  ) return undefined;
  const target = paperLearningContextPath(context);
  if (!fs.existsSync(target)) return undefined;
  if (fs.lstatSync(target).isSymbolicLink()) {
    throw new Error("Paper Learning context must not be a symbolic link.");
  }
  if (fs.statSync(target).size > MAX_CONTEXT_BYTES) {
    throw new Error("Paper Learning context exceeds the persisted context budget.");
  }
  const value = JSON.parse(fs.readFileSync(target, "utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Paper Learning context is invalid.");
  }
  const item = value as Record<string, unknown>;
  const plan = item.plan;
  if (
    item.schemaVersion !== "0.1"
    || item.projectId !== context.projectId
    || item.missionId !== context.missionId
    || typeof item.generatedAt !== "string"
    || !item.generatedAt
    || !plan
    || typeof plan !== "object"
    || Array.isArray(plan)
  ) {
    throw new Error("Paper Learning context identity is invalid.");
  }
  const typedPlan = plan as Record<string, unknown>;
  if (
    (typedPlan.studyMode !== "follow_source" && typedPlan.studyMode !== "understanding_first")
    || typeof typedPlan.sourceTitle !== "string"
    || !typedPlan.sourceTitle
    || !Array.isArray(typedPlan.claims)
    || !Array.isArray(typedPlan.prerequisites)
    || !Array.isArray(typedPlan.initialPath)
  ) {
    throw new Error("Paper Learning plan projection is invalid.");
  }
  return item as unknown as PersistedPaperLearningContext;
}

function paperCriterionSet(status: CompletionGateStatus): Set<string> {
  return new Set(status.criteria.map((criterion) => criterion.id));
}

export function paperCompletionConfigurationNeeded(
  status: CompletionGateStatus,
): PaperCompletionConfiguration["status"] {
  const ids = paperCriterionSet(status);
  if (PAPER_COMPLETION_CRITERION_IDS.every((id) => ids.has(id))) {
    return "already_configured";
  }
  const paperIds = new Set<string>(PAPER_COMPLETION_CRITERION_IDS);
  if (status.criteria.some((criterion) => !paperIds.has(criterion.id))) {
    return "custom_contract_preserved";
  }
  return "configured";
}

export async function ensurePaperCompletionProfile(
  repoRoot: string,
  context: ProjectReadContext,
): Promise<PaperCompletionConfiguration> {
  const scope = requireWorkspaceMission(context);
  const raw = await runLocalLearningTool(repoRoot, ["completion-status"]);
  const current = parseCompletionGateStatus(raw, scope.projectId);
  const decision = paperCompletionConfigurationNeeded(current);
  if (decision !== "configured") return { status: decision };

  const links: Partial<Record<PaperCompletionCriterionId, string[]>> = {};
  for (const criterion of current.criteria) {
    if (PAPER_COMPLETION_CRITERION_IDS.includes(criterion.id as PaperCompletionCriterionId)) {
      links[criterion.id as PaperCompletionCriterionId] = criterion.citedEvidenceIds;
    }
  }
  await runLocalLearningTool(
    repoRoot,
    ["criteria-set", "-"],
    createPaperCompletionCriteria(links) as unknown as Record<string, unknown>,
  );
  return { status: "configured" };
}
