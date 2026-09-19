import { NextResponse, type NextRequest } from "next/server";
import {
  AgentAdapterError,
  createConfiguredAgentAdapter,
} from "@/lib/agent-adapter";
import { generateTeachingAdvance } from "@/lib/learning-orchestrator";
import { readTeachingRoutingContext } from "@/lib/teaching-context";
import {
  RuntimeBridgeError,
  advancePendingLearningTurn,
  readPendingLearningTurn,
} from "@/lib/runtime-bridge";
import { sameOrigin } from "@/lib/server-request";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";

const DECISION_ID = /^dec_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site submissions are not allowed." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }
  const decisionId = body && typeof body === "object" && !Array.isArray(body)
    && typeof (body as Record<string, unknown>).decisionId === "string"
    ? (body as Record<string, unknown>).decisionId as string
    : "";
  if (!DECISION_ID.test(decisionId)) {
    return NextResponse.json({ error: "The pending learning move is invalid." }, { status: 400 });
  }

  const repoRoot = findRepoRoot();
  try {
    const pending = await readPendingLearningTurn(repoRoot);
    if (!pending) {
      return NextResponse.json({ error: "No learner response is awaiting assessment." }, { status: 409 });
    }
    if (pending.decision.id !== decisionId) {
      return NextResponse.json(
        { error: "The pending learning move changed. Refresh before assessing it." },
        { status: 409 },
      );
    }
    const teachingContext = readTeachingRoutingContext(repoRoot);
    const enrichedPending = Object.keys(teachingContext).length
      ? { ...pending, teaching_context: teachingContext as unknown as Record<string, unknown> }
      : pending;
    const adapter = createConfiguredAgentAdapter();
    const advance = await generateTeachingAdvance(adapter, enrichedPending, request.signal);
    const result = await advancePendingLearningTurn(repoRoot, decisionId, advance);
    const next = result.next_decision as Record<string, unknown> | undefined;
    const evidence = result.evidence as Record<string, unknown> | undefined;
    return NextResponse.json({
      ok: true,
      evidenceId: typeof evidence?.id === "string" ? evidence.id : undefined,
      nextDecisionId: typeof next?.id === "string" ? next.id : undefined,
    });
  } catch (error) {
    if (error instanceof AgentAdapterError) {
      const status = error.code === "configuration"
        ? 503
        : error.code === "timeout"
          ? 504
          : 502;
      const message = error.code === "configuration"
        ? "No compatible Provider is configured for the Workspace."
        : error.code === "timeout"
          ? "The Provider did not finish the assessment in time."
          : error.code === "refusal"
            ? "The Provider declined this assessment. Continue with an external Agent."
            : "The Provider could not produce a valid structured learning turn.";
      return NextResponse.json({ error: message }, { status });
    }
    if (error instanceof RuntimeBridgeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.kind === "conflict" ? 409 : 500 },
      );
    }
    return NextResponse.json(
      { error: "Could not advance the learning turn safely." },
      { status: 500 },
    );
  }
}
