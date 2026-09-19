import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeAssistantHostRequest } from "@/lib/assistant-host-auth";
import { AgentAdapterError } from "@/lib/agent-adapter";
import { createWorkspaceAgentAdapter } from "@/lib/workspace-provider";
import { parseHostTurnInput } from "@/lib/host-turn";
import { resolveProjectReadContext } from "@/lib/project-store";
import {
  createResearchAuditRecord,
  writeResearchAuditRecord,
} from "@/lib/research-audit-store";
import {
  RESEARCH_MODES,
  createResearchInvocation,
  runResearchCapability,
  type ResearchMode,
} from "@/lib/research-capability";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";

function text(value: unknown, maximum: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : undefined;
}

export async function POST(request: NextRequest) {
  if (!authorizeAssistantHostRequest(request)) {
    return NextResponse.json({ error: "Research authorization is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a Research Capability request object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  let turn;
  try {
    turn = parseHostTurnInput(payload.turn);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Host turn is invalid." },
      { status: 400 },
    );
  }

  const purpose = text(payload.purpose, 1200);
  const query = text(payload.query, 1600);
  const claim = payload.claim === undefined ? undefined : text(payload.claim, 1800);
  const mode = payload.mode;
  if (
    !purpose
    || !query
    || typeof mode !== "string"
    || !RESEARCH_MODES.includes(mode as ResearchMode)
    || (payload.claim !== undefined && !claim)
    || (mode === "verify_claim" && !claim)
  ) {
    return NextResponse.json({ error: "Research purpose, mode, query, or claim is invalid." }, { status: 400 });
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
      { error: "Research requires an active workspace Project and Mission." },
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
    const invocation = createResearchInvocation({
      turn,
      projectId: context.projectId,
      missionId: context.missionId,
      purpose,
      mode: mode as ResearchMode,
      query,
      ...(claim ? { claim } : {}),
    });
    const hasResolvedSource = turn.references.some((reference) => Boolean(reference.excerpt));
    const adapter = hasResolvedSource ? createWorkspaceAgentAdapter(repoRoot) : undefined;
    const result = await runResearchCapability(adapter, invocation, request.signal);

    const audit = createResearchAuditRecord(invocation, result);
    const auditRoot = path.join(
      repoRoot,
      ".learning",
      "projects",
      context.projectId,
      "capabilities",
      "research",
      "invocations",
    );
    writeResearchAuditRecord(auditRoot, audit);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof AgentAdapterError) {
      const status = error.code === "configuration"
        ? 503
        : error.code === "timeout"
          ? 504
          : 502;
      const message = error.code === "configuration"
        ? "No compatible Provider is configured for Research."
        : error.code === "timeout"
          ? "The Provider did not finish Research in time."
          : error.code === "refusal"
            ? "The Provider declined the Research request."
            : "The Provider could not produce a valid Research result.";
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research could not complete safely." },
      { status: 500 },
    );
  }
}
