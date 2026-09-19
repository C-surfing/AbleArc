import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeAssistantHostRequest } from "@/lib/assistant-host-auth";
import {
  ASSISTANT_HOST_OPERATIONS,
  normalizeAssistantLearningContext,
  projectAssistantLearningState,
  type AssistantHostOperation,
} from "@/lib/assistant-host";
import { parseHostTurnInput } from "@/lib/host-turn";
import { inspectLearningKernel } from "@/lib/learning-kernel";
import { runLocalLearningTool } from "@/lib/local-learning-tool";
import { readLearnerProfile } from "@/lib/learner-profile";
import { resolveProjectReadContext } from "@/lib/project-store";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function optionalText(value: unknown, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error("Assistant host text field is invalid.");
  }
  return value.trim();
}

function assertTurnScope(
  turn: ReturnType<typeof parseHostTurnInput>,
  repoRoot: string,
): void {
  const context = resolveProjectReadContext(repoRoot);
  if (!context) {
    if (turn.projectId || turn.missionId) {
      throw new Error("The host turn references a Project that is not selected locally.");
    }
    return;
  }
  if (turn.projectId && turn.projectId !== context.projectId) {
    throw new Error("The host turn project does not match the selected Project.");
  }
  if (turn.missionId && turn.missionId !== context.missionId) {
    throw new Error("The host turn mission does not match the selected Mission.");
  }
}

export async function POST(request: NextRequest) {
  if (!authorizeAssistantHostRequest(request)) {
    return NextResponse.json(
      { error: "Assistant host authorization is required." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an assistant host operation." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const operation = payload.operation;
  if (
    typeof operation !== "string"
    || !ASSISTANT_HOST_OPERATIONS.includes(operation as AssistantHostOperation)
  ) {
    return NextResponse.json({ error: "Assistant host operation is invalid." }, { status: 400 });
  }

  const repoRoot = findRepoRoot();
  const profile = readLearnerProfile(path.join(repoRoot, ".learning", "LEARNER.md"));

  try {
    if (operation === "get_learning_state") {
      return NextResponse.json({
        ok: true,
        operation,
        state: projectAssistantLearningState(inspectLearningKernel(repoRoot), profile),
      });
    }

    if (operation === "provide_learning_context") {
      const turn = parseHostTurnInput(payload.turn);
      assertTurnScope(turn, repoRoot);
      return NextResponse.json({
        ok: true,
        operation,
        context: normalizeAssistantLearningContext(turn),
        state: projectAssistantLearningState(inspectLearningKernel(repoRoot), profile),
      });
    }

    const projectId = optionalText(payload.projectId, 64);
    if (projectId && !PROJECT_ID.test(projectId)) {
      return NextResponse.json({ error: "Project identifier is invalid." }, { status: 400 });
    }

    let current = resolveProjectReadContext(repoRoot);
    let created = false;
    let switched = false;

    if (projectId && current?.projectId !== projectId) {
      await runLocalLearningTool(repoRoot, ["switch-project", projectId]);
      current = resolveProjectReadContext(repoRoot);
      switched = true;
    } else if (!current) {
      const goal = optionalText(payload.goal, 1200);
      const title = optionalText(payload.title, 200) ?? goal?.slice(0, 80);
      const why = optionalText(payload.why, 2400) ?? "";
      if (!goal || !title) {
        return NextResponse.json(
          { error: "Starting a new learning Project requires a title/capability goal." },
          { status: 400 },
        );
      }
      const requestedId = optionalText(payload.newProjectId, 64);
      if (requestedId && !PROJECT_ID.test(requestedId)) {
        return NextResponse.json({ error: "New Project identifier is invalid." }, { status: 400 });
      }
      await runLocalLearningTool(
        repoRoot,
        ["create-project", "-"],
        {
          title,
          goal,
          why,
          ...(requestedId ? { project_id: requestedId } : {}),
        },
      );
      current = resolveProjectReadContext(repoRoot);
      created = true;
    }

    let normalizedContext;
    if (payload.turn !== undefined) {
      const turn = parseHostTurnInput(payload.turn);
      assertTurnScope(turn, repoRoot);
      normalizedContext = normalizeAssistantLearningContext(turn);
    }

    return NextResponse.json({
      ok: true,
      operation,
      created,
      switched,
      ...(normalizedContext ? { context: normalizedContext } : {}),
      state: projectAssistantLearningState(inspectLearningKernel(repoRoot), profile),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant host operation failed.";
    const conflict = /selected|current status|archived|paused|migrated|already/i.test(message);
    const invalid = /invalid|required|does not match|references/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: invalid ? 400 : conflict ? 409 : 500 },
    );
  }
}
