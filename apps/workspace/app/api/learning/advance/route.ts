import { NextResponse, type NextRequest } from "next/server";
import { AgentAdapterError } from "@/lib/agent-adapter";
import { createWorkspaceAgentAdapter } from "@/lib/workspace-provider";
import {
  LearningKernelConflictError,
  advanceLearningKernelTurn,
} from "@/lib/learning-kernel";
import { TeachingAdvanceValidationError } from "@/lib/learning-orchestrator";
import { RuntimeBridgeError } from "@/lib/runtime-bridge";
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
    const adapter = createWorkspaceAgentAdapter(repoRoot);
    const result = await advanceLearningKernelTurn(
      repoRoot,
      decisionId,
      adapter,
      request.signal,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof LearningKernelConflictError) {
      return NextResponse.json({ error: error.message, errorType: "runtime_conflict" }, { status: 409 });
    }
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
      const errorType = error.code === "configuration"
        ? "provider_configuration"
        : error.code === "timeout"
          ? "provider_timeout"
          : error.code === "refusal"
            ? "provider_refusal"
            : error.code === "invalid_response"
              ? "provider_invalid_response"
              : "provider_request";
      return NextResponse.json({ error: message, errorType }, { status });
    }
    if (error instanceof TeachingAdvanceValidationError) {
      return NextResponse.json(
        {
          error: "The Provider response did not match the required learning-turn structure after bounded repair attempts.",
          errorType: "structured_output_validation",
          path: error.path,
        },
        { status: 502 },
      );
    }
    if (error instanceof RuntimeBridgeError) {
      return NextResponse.json(
        {
          error: error.message,
          errorType: error.kind === "conflict" ? "runtime_conflict" : "runtime_failure",
        },
        { status: error.kind === "conflict" ? 409 : 500 },
      );
    }
    console.error("Unexpected learning-advance failure.", error);
    return NextResponse.json(
      { error: "Could not advance the learning turn safely.", errorType: "unknown" },
      { status: 500 },
    );
  }
}
