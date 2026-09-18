import { NextResponse, type NextRequest } from "next/server";
import {
  AgentAdapterError,
  createConfiguredAgentAdapter,
} from "@/lib/agent-adapter";
import { parseResearchCapabilityRequest } from "@/lib/capability";
import {
  listResearchCapabilityTraces,
  writeResearchCapabilityTrace,
} from "@/lib/capability-store";
import { runResearchCapability } from "@/lib/research-capability";
import { loadWorkspaceSnapshot, findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

export function GET() {
  try {
    const traces = listResearchCapabilityTraces(findRepoRoot()).slice(0, 20);
    return NextResponse.json({ traces }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Research capability traces are unavailable." }, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site submissions are not allowed." }, { status: 403 });
  }

  let input;
  try {
    input = parseResearchCapabilityRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research capability request is invalid." },
      { status: 400 },
    );
  }

  const repoRoot = findRepoRoot();
  try {
    const snapshot = loadWorkspaceSnapshot();
    if (snapshot.projectId !== input.expectedProjectId) {
      return NextResponse.json(
        { error: "The selected Project changed before research started." },
        { status: 409 },
      );
    }
    if (!snapshot.decision || snapshot.decision.id !== input.decisionId) {
      return NextResponse.json(
        { error: "Research must be tied to the current Runtime Decision." },
        { status: 409 },
      );
    }

    const adapter = createConfiguredAgentAdapter();
    const result = await runResearchCapability(adapter, input, request.signal);
    const trace = writeResearchCapabilityTrace(repoRoot, input, result);
    return NextResponse.json({
      ok: true,
      invocationId: trace.invocation.id,
      result: trace.result,
      sources: trace.sources,
    });
  } catch (error) {
    if (error instanceof AgentAdapterError) {
      const status = error.code === "configuration"
        ? 503
        : error.code === "timeout"
          ? 504
          : 502;
      return NextResponse.json(
        {
          error: error.code === "configuration"
            ? "No compatible Provider is configured for Research Capability."
            : error.code === "timeout"
              ? "Research Capability did not finish in time."
              : "Research Capability could not produce a valid grounded result.",
        },
        { status },
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error && error.message.startsWith("selected Project")
          ? error.message
          : "Research Capability could not be recorded safely.",
      },
      { status: 500 },
    );
  }
}
