import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import {
  commitLearningTurnInput,
  inspectLearningInput,
  recordLearnerActionInput,
  startOrResumeInput,
} from "./contracts.ts";
import { recordAttributedLearnerResponse } from "./runtime.ts";

import {
  projectAssistantLearningState,
} from "../../workspace/lib/assistant-host.ts";
import {
  inspectLearningKernel,
  projectLearningKernelAdvance,
} from "../../workspace/lib/learning-kernel.ts";
import {
  validateTeachingAdvance,
} from "../../workspace/lib/learning-orchestrator.ts";
import {
  readLearnerProfile,
} from "../../workspace/lib/learner-profile.ts";
import {
  resolveProjectReadContext,
} from "../../workspace/lib/project-store.ts";
import {
  advancePendingLearningTurn,
  readPendingLearningTurn,
} from "../../workspace/lib/runtime-bridge.ts";
import {
  runLocalLearningTool,
} from "../../workspace/lib/local-learning-tool.ts";
import {
  findRepoRoot,
} from "../../workspace/lib/workspace-data.ts";
import type { WorkspaceSnapshot } from "../../workspace/lib/types.ts";

const SERVER_NAME = "ablearc-learning";
const SERVER_VERSION = "0.1.0";

function repoRoot(): string {
  const configured = process.env.ABLEARC_REPO_ROOT?.trim();
  return configured ? path.resolve(configured) : findRepoRoot();
}

function profileFor(repo: string) {
  const context = resolveProjectReadContext(repo);
  const learnerPath = context?.learnerPath ?? path.join(repo, ".learning", "LEARNER.md");
  return readLearnerProfile(learnerPath);
}

function compactLearningState(snapshot: WorkspaceSnapshot, repo: string) {
  const profile = profileFor(repo);
  const projected = projectAssistantLearningState(snapshot, profile);

  if (!snapshot.hasMission || !snapshot.projectId) {
    return {
      schemaVersion: "0.1",
      status: "empty",
      projects: snapshot.projects.slice(0, 20).map((project) => ({
        id: project.id,
        title: project.title,
        status: project.status,
        selected: project.selected,
      })),
      profile: projected.profile ?? null,
    };
  }

  return {
    schemaVersion: "0.1",
    status: "active",
    project: projected.project ?? null,
    mission: projected.mission,
    frontier: projected.frontier,
    currentMove: snapshot.decision
      ? {
          decisionId: snapshot.decision.id,
          target: snapshot.decision.target,
          move: snapshot.decision.move,
          learnerAction: snapshot.expectedLearnerAction,
          hasLearnerResponse: snapshot.decision.hasLearnerResponse,
        }
      : null,
    nextAction: projected.nextAction,
    reviewCandidates: projected.reviewCandidates.slice(0, 5),
    recentEvidence: projected.recentEvidence.slice(0, 6),
    map: {
      frontierIds: projected.map.frontierIds,
      nodes: projected.map.nodes.slice(0, 12),
    },
    profile: projected.profile ?? null,
    projects: snapshot.projects.slice(0, 20).map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status,
      selected: project.selected,
    })),
  };
}

function stateNow(repo: string) {
  return compactLearningState(inspectLearningKernel(repo), repo);
}

function ok(structuredContent: Record<string, unknown>, summary: string) {
  return {
    structuredContent,
    content: [{ type: "text" as const, text: summary }],
  };
}

function toolError(error: unknown) {
  const text = error instanceof Error ? error.message : "AbleArc operation failed.";
  return {
    isError: true,
    content: [{ type: "text" as const, text }],
  };
}

export function createAbleArcMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "AbleArc is the learner-truth control plane, not a second tutor. Inspect state before consequential teaching decisions. ChatGPT performs teaching judgment; MCP only reads/writes validated learning state. Never expose internal IDs or receipt mechanics to the learner. Record a learner action only when the message actually answers the current move, then commit one evidence-grounded turn.",
    },
  );

  server.registerTool(
    "inspect_learning",
    {
      title: "Inspect learning state",
      description:
        "Read the selected AbleArc Project, Mission, frontier, current learner action, recent decisive Evidence, review candidates, and bounded map context. Use before a consequential teaching decision or when the learner asks where they are.",
      inputSchema: inspectLearningInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const state = stateNow(repoRoot());
        return ok({ state }, state.status === "empty"
          ? "No active AbleArc learning Project is selected."
          : "Loaded the current AbleArc learning state.");
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "start_or_resume_learning",
    {
      title: "Start or resume learning",
      description:
        "Resume the selected AbleArc Project, switch to a named Project, or create a new Project when the learner clearly wants a new learning goal. Set createNew=true only for an explicit new Project.",
      inputSchema: startOrResumeInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, createNew, newProjectId, title, goal, why }) => {
      const repo = repoRoot();
      try {
        let current = resolveProjectReadContext(repo);
        let created = false;
        let switched = false;

        if (createNew) {
          if (!goal) throw new Error("Creating a new learning Project requires a capability goal.");
          const learnerTitle = title ?? goal.slice(0, 80);
          await runLocalLearningTool(repo, ["create-project", "-"], {
            title: learnerTitle,
            goal,
            why: why ?? "",
            ...(newProjectId ? { project_id: newProjectId } : {}),
          });
          current = resolveProjectReadContext(repo);
          created = true;
        } else if (projectId && current?.projectId !== projectId) {
          await runLocalLearningTool(repo, ["switch-project", projectId]);
          current = resolveProjectReadContext(repo);
          switched = true;
        } else if (!current) {
          if (!goal) {
            throw new Error("No AbleArc Project exists yet. Supply a learning goal to create one.");
          }
          const learnerTitle = title ?? goal.slice(0, 80);
          await runLocalLearningTool(repo, ["create-project", "-"], {
            title: learnerTitle,
            goal,
            why: why ?? "",
            ...(newProjectId ? { project_id: newProjectId } : {}),
          });
          current = resolveProjectReadContext(repo);
          created = true;
        }

        const state = stateNow(repo);
        return ok(
          { created, switched, state },
          created
            ? "Created and selected a new AbleArc learning Project."
            : switched
              ? "Switched the selected AbleArc learning Project."
              : "Resumed the selected AbleArc learning Project.",
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "record_learner_action",
    {
      title: "Record learner action",
      description:
        "Persist the learner's actual answer to the current AbleArc Decision. Call only after inspecting state and confirming that this exact learner message answers the current learnerAction. This creates an Observation, not Evidence or mastery.",
      inputSchema: recordLearnerActionInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ decisionId, response }) => {
      const repo = repoRoot();
      try {
        const snapshot = inspectLearningKernel(repo);
        if (!snapshot.decision || snapshot.decision.id !== decisionId) {
          throw new Error("The current AbleArc learning move changed. Inspect learning state again.");
        }
        if (snapshot.decision.hasLearnerResponse) {
          throw new Error("The current AbleArc learning move already has a learner response.");
        }

        const receipt = await recordAttributedLearnerResponse(repo, decisionId, response);
        return ok(
          {
            observationId: receipt.id,
            decisionId,
            awaitingAssessment: true,
          },
          "Recorded the learner action as an Observation. It still requires assessment before it can become Evidence.",
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "commit_learning_turn",
    {
      title: "Commit learning turn",
      description:
        "Commit ChatGPT's structured assessment of an already-recorded learner action and issue exactly one next cognitive move. AbleArc validates the payload and Runtime remains authoritative. This tool never calls a second model.",
      inputSchema: commitLearningTurnInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ decisionId, advance }) => {
      const repo = repoRoot();
      try {
        const pending = await readPendingLearningTurn(repo);
        if (!pending || pending.decision.id !== decisionId) {
          throw new Error("No matching learner action is awaiting assessment. Inspect learning state again.");
        }

        const validated = validateTeachingAdvance(advance, "host:chatgpt-plugin");
        const runtimeResult = await advancePendingLearningTurn(repo, decisionId, validated);
        const committed = projectLearningKernelAdvance(validated, runtimeResult);
        const state = stateNow(repo);

        return ok(
          {
            committed,
            state,
          },
          "Committed one evidence-grounded AbleArc learning turn and loaded the updated state.",
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

export function createHttpApp() {
  const handler = createMcpHandler(() => createAbleArcMcpServer());
  const app = createMcpExpressApp();

  app.get("/healthz", (_request, response) => {
    response.json({ ok: true, server: SERVER_NAME, version: SERVER_VERSION });
  });
  app.all("/mcp", toNodeHandler(handler));

  return app;
}

function isMainModule(): boolean {
  const current = fileURLToPath(import.meta.url);
  return process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(current) : false;
}

if (isMainModule()) {
  const port = Number(process.env.ABLEARC_MCP_PORT ?? "8787");
  const host = process.env.ABLEARC_MCP_HOST?.trim() || "127.0.0.1";

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("ABLEARC_MCP_PORT must be an integer between 1 and 65535.");
  }

  createHttpApp().listen(port, host, () => {
    console.error(`AbleArc MCP listening on http://${host}:${port}/mcp`);
  });
}
