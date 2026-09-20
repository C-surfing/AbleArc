import type { AgentAdapter } from "./agent-adapter.ts";
import {
  generateTeachingAdvance,
  type PendingLearningTurn,
  type TeachingAdvance,
} from "./learning-orchestrator.ts";
import {
  readTeachingRoutingContext,
  type TeachingRoutingContext,
} from "./teaching-context.ts";
import { loadWorkspaceSnapshot } from "./workspace-data.ts";
import type { WorkspaceSnapshot } from "./types.ts";

export class LearningKernelConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningKernelConflictError";
  }
}

export interface LearningKernelAdvanceResult {
  policy: TeachingAdvance["policy"];
  evidenceId?: string;
  nextDecisionId?: string;
}

export function inspectLearningKernel(repoRoot: string): WorkspaceSnapshot {
  return loadWorkspaceSnapshot(repoRoot);
}

function enrichPendingTurn(
  pending: PendingLearningTurn,
  teachingContext: TeachingRoutingContext,
): PendingLearningTurn {
  return Object.keys(teachingContext).length
    ? {
        ...pending,
        teaching_context: teachingContext as unknown as Record<string, unknown>,
      }
    : pending;
}

export function projectLearningKernelAdvance(
  advance: TeachingAdvance,
  runtimeResult: Record<string, unknown>,
): LearningKernelAdvanceResult {
  const next = runtimeResult.next_decision;
  const evidence = runtimeResult.evidence;
  const nextRecord = next && typeof next === "object" && !Array.isArray(next)
    ? next as Record<string, unknown>
    : undefined;
  const evidenceRecord = evidence && typeof evidence === "object" && !Array.isArray(evidence)
    ? evidence as Record<string, unknown>
    : undefined;

  return {
    policy: advance.policy,
    ...(typeof evidenceRecord?.id === "string" ? { evidenceId: evidenceRecord.id } : {}),
    ...(typeof nextRecord?.id === "string" ? { nextDecisionId: nextRecord.id } : {}),
  };
}

export async function advanceLearningKernelTurn(
  repoRoot: string,
  decisionId: string,
  adapter: AgentAdapter,
  signal?: AbortSignal,
): Promise<LearningKernelAdvanceResult> {
  // Keep the process-spawning Runtime bridge behind the actual mutation path.
  // Read-only Kernel consumers and pure projection tests should not need to load it.
  const {
    advancePendingLearningTurn,
    readPendingLearningTurn,
  } = await import("./runtime-bridge.ts");
  const pending = await readPendingLearningTurn(repoRoot);
  if (!pending) {
    throw new LearningKernelConflictError("No learner response is awaiting assessment.");
  }
  if (pending.decision.id !== decisionId) {
    throw new LearningKernelConflictError(
      "The pending learning move changed. Refresh before assessing it.",
    );
  }

  const teachingContext = readTeachingRoutingContext(repoRoot);
  const advance = await generateTeachingAdvance(
    adapter,
    enrichPendingTurn(pending, teachingContext),
    signal,
  );
  const runtimeResult = await advancePendingLearningTurn(repoRoot, decisionId, advance);
  return projectLearningKernelAdvance(advance, runtimeResult);
}
