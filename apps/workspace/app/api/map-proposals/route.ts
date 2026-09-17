import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { parseLearningMapProposalReviews } from "@/lib/learning-map-proposal-review";
import { resolveProjectReadContext } from "@/lib/project-store";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const PROPOSAL_ID = /^mp_[A-Za-z0-9_-]{4,124}$/;
const MAX_STDOUT_BYTES = 512 * 1024;
const MAX_STDERR_BYTES = 32 * 1024;

class MapProposalApiError extends Error {
  constructor(message: string, readonly conflict = false) {
    super(message);
    this.name = "MapProposalApiError";
  }
}

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

function selectedWorkspaceProject(repoRoot: string) {
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2" || !context.missionId) {
    throw new MapProposalApiError("Roadmap proposal review requires a selected workspace Project.");
  }
  return context;
}

function runMapProposalCommand(repoRoot: string, args: string[]): Promise<unknown> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learning_map_proposals.py");
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, "--repo", repoRoot, ...args],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    let oversized = false;
    child.stdout.on("data", (chunk: Buffer) => {
      if (oversized) return;
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > MAX_STDOUT_BYTES) {
        oversized = true;
        child.kill();
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (Buffer.byteLength(stderr, "utf8") < MAX_STDERR_BYTES) stderr += chunk.toString("utf8");
    });
    child.on("error", () => reject(new MapProposalApiError("The local roadmap proposal runtime could not start.")));
    child.on("close", (code) => {
      if (oversized) {
        reject(new MapProposalApiError("The local roadmap proposal runtime returned too much data."));
        return;
      }
      if (code !== 0) {
        const conflict = stderr.includes("stale LearningMap proposal")
          || stderr.includes("already has a decision")
          || stderr.includes("another decision")
          || stderr.includes("paused Project is read-only")
          || stderr.includes("archived Project map is read-only")
          || stderr.includes("active Project requires an active Mission");
        reject(new MapProposalApiError(
          conflict
            ? "The roadmap proposal can no longer be applied as requested. Refresh its canonical Map status."
            : "The LearningMap authority boundary rejected this proposal action.",
          conflict,
        ));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new MapProposalApiError("The local roadmap proposal runtime returned invalid JSON."));
      }
    });
  });
}

async function readProposals(repoRoot: string, projectId: string) {
  const value = await runMapProposalCommand(repoRoot, ["list"]);
  return parseLearningMapProposalReviews(value, projectId);
}

export async function GET() {
  const repoRoot = findRepoRoot();
  try {
    const context = selectedWorkspaceProject(repoRoot);
    const proposals = await readProposals(repoRoot, context.projectId);
    return NextResponse.json({ proposals }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Roadmap proposals are unavailable." },
      { status: 404 },
    );
  }
}

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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a roadmap proposal action object." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  if (Object.keys(payload).some((key) => !["projectId", "proposalId", "decision", "reason"].includes(key))) {
    return NextResponse.json({ error: "The roadmap proposal action contains unsupported fields." }, { status: 400 });
  }
  const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
  const proposalId = typeof payload.proposalId === "string" ? payload.proposalId : "";
  const decision = payload.decision;
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (
    !PROJECT_ID.test(projectId)
    || !PROPOSAL_ID.test(proposalId)
    || (decision !== "accepted" && decision !== "rejected")
    || !reason
    || reason.length > 600
  ) {
    return NextResponse.json({ error: "The roadmap proposal action is invalid." }, { status: 400 });
  }

  const repoRoot = findRepoRoot();
  try {
    const context = selectedWorkspaceProject(repoRoot);
    if (context.projectId !== projectId) {
      throw new MapProposalApiError("The selected Project changed. Refresh before reviewing the roadmap proposal.", true);
    }
    await runMapProposalCommand(repoRoot, ["decide", proposalId, decision, reason]);
    const proposals = await readProposals(repoRoot, projectId);
    return NextResponse.json({ ok: true, proposals }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const proposalError = error instanceof MapProposalApiError ? error : undefined;
    return NextResponse.json(
      { error: proposalError?.message || "Could not record the roadmap proposal decision safely." },
      { status: proposalError?.conflict ? 409 : 500 },
    );
  }
}
