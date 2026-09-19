import { NextResponse, type NextRequest } from "next/server";
import { authorizeAssistantHostRequest } from "@/lib/assistant-host-auth";
import {
  AgentAdapterError,
  createConfiguredAgentAdapter,
} from "@/lib/agent-adapter";
import { parseHostTurnInput } from "@/lib/host-turn";
import { resolveProjectReadContext } from "@/lib/project-store";
import {
  PaperSourceContextError,
  generatePaperLearningPlan,
  parsePaperRequestedMode,
} from "@/lib/paper-learning";
import { ensurePaperCompletionProfile, writePaperLearningContext } from "@/lib/paper-session";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!authorizeAssistantHostRequest(request)) {
    return NextResponse.json({ error: "Paper Learning authorization is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a Paper Learning request object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  let turn;
  let requestedMode;
  try {
    turn = parseHostTurnInput(payload.turn);
    requestedMode = parsePaperRequestedMode(payload.mode);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Paper Learning request is invalid." },
      { status: 400 },
    );
  }

  const repoRoot = findRepoRoot();
  const context = resolveProjectReadContext(repoRoot);
  if (
    !context
    || context.layout !== "workspace-v0.2"
    || !context.missionId
    || context.projectStatus !== "active"
  ) {
    return NextResponse.json(
      { error: "Paper Learning requires an active workspace Project and Mission." },
      { status: 409 },
    );
  }
  if (
    (turn.projectId && turn.projectId !== context.projectId)
    || (turn.missionId && turn.missionId !== context.missionId)
  ) {
    return NextResponse.json(
      { error: "The host turn does not match the selected Project and Mission." },
      { status: 409 },
    );
  }

  try {
    const adapter = createConfiguredAgentAdapter();
    const plan = await generatePaperLearningPlan(
      adapter,
      { turn, requestedMode },
      request.signal,
    );
    const completionProfile = await ensurePaperCompletionProfile(repoRoot, context);
    const persisted = writePaperLearningContext(context, plan);
    return NextResponse.json({
      ok: true,
      plan,
      context: {
        projectId: persisted.projectId,
        missionId: persisted.missionId,
        generatedAt: persisted.generatedAt,
      },
      completionProfile: completionProfile.status,
    });
  } catch (error) {
    if (error instanceof PaperSourceContextError) {
      return NextResponse.json(
        {
          error: error.message,
          referenceIds: error.referenceIds,
          ...(error.requestedCapability
            ? { requestedCapability: error.requestedCapability }
            : {}),
        },
        { status: error.requestedCapability ? 409 : 400 },
      );
    }
    if (error instanceof AgentAdapterError) {
      const status = error.code === "configuration"
        ? 503
        : error.code === "timeout"
          ? 504
          : 502;
      const message = error.code === "configuration"
        ? "No compatible Provider is configured for Paper Learning."
        : error.code === "timeout"
          ? "The Provider did not finish the paper plan in time."
          : error.code === "refusal"
            ? "The Provider declined this paper-planning request."
            : "The Provider could not produce a valid paper-learning plan.";
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(
      { error: "Could not build a grounded paper-learning plan." },
      { status: 500 },
    );
  }
}
