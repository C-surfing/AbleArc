import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { resolveProjectReadContext } from "@/lib/project-store";
import { parseStateProposalReviews } from "@/lib/state-proposal-review";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const PROPOSAL_ID = /^sp_[A-Za-z0-9_-]+$/;
const MAX_STDOUT_BYTES = 512 * 1024;
const MAX_STDERR_BYTES = 32 * 1024;

class ProposalApiError extends Error {
  constructor(message: string, readonly conflict = false) {
    super(message);
    this.name = "ProposalApiError";
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
    throw new ProposalApiError("State proposal review requires a selected workspace Project.");
  }
  return context;
}

function runProposalCommand(repoRoot: string, args: string[]): Promise<unknown> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "state_proposals.py");
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
    child.on("error", () => reject(new ProposalApiError("The local proposal review runtime could not start.")));
    child.on("close", (code) => {
      if (oversized) {
        reject(new ProposalApiError("The local proposal review runtime returned too much data."));
        return;
      }
      if (code !== 0) {
        const conflict = stderr.includes("transition policy rejected acceptance")
          || stderr.includes("proposal already has a state decision")
          || stderr.includes("stale state proposal")
          || stderr.includes("paused Project is read-only")
          || stderr.includes("archived Project is read-only")
          || stderr.includes("active Project requires an active Mission");
        reject(new ProposalApiError(
          conflict
            ? "The proposal can no longer be applied as requested. Refresh its Runtime status."
            : "The Runtime rejected the state proposal action.",
          conflict,
        ));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new ProposalApiError("The local proposal review runtime returned invalid JSON."));
      }
    });
  });
}

async function readProposals(repoRoot: string, projectId: string) {
  const value = await runProposalCommand(repoRoot, ["list"]);
  return parseStateProposalReviews(value, projectId);
}

export async function GET() {
  const repoRoot = findRepoRoot();
  try {
    const context = selectedWorkspaceProject(repoRoot);
    const proposals = await readProposals(repoRoot, context.projectId);
    return NextResponse.json({ proposals }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "State proposals are unavailable." },
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
    return NextResponse.json({ error: "Expected a state proposal action object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const action = payload.action === undefined ? "decide" : payload.action;
  const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
  const repoRoot = findRepoRoot();

  if (action === "reconcile") {
    if (!PROJECT_ID.test(projectId)) {
      return NextResponse.json({ error: "The state proposal reconciliation is invalid." }, { status: 400 });
    }
    try {
      const context = selectedWorkspaceProject(repoRoot);
      if (context.projectId !== projectId) {
        throw new ProposalApiError("The selected Project changed. Refresh before reconciling proposals.", true);
      }
      await runProposalCommand(repoRoot, ["reconcile"]);
      const proposals = await readProposals(repoRoot, projectId);
      return NextResponse.json({ ok: true, proposals }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      const proposalError = error instanceof ProposalApiError ? error : undefined;
      return NextResponse.json(
        { error: proposalError?.message || "Could not reconcile low-risk state proposals safely." },
        { status: proposalError?.conflict ? 409 : 500 },
      );
    }
  }

  if (action !== "decide") {
    return NextResponse.json({ error: "The state proposal action is invalid." }, { status: 400 });
  }

  const proposalId = typeof payload.proposalId === "string" ? payload.proposalId : "";
  const decision = payload.decision;
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  const overridePolicy = payload.overridePolicy;
  if (
    !PROJECT_ID.test(projectId)
    || !PROPOSAL_ID.test(proposalId)
    || (decision !== "accepted" && decision !== "rejected")
    || !reason
    || reason.length > 600
    || typeof overridePolicy !== "boolean"
    || (decision === "rejected" && overridePolicy)
  ) {
    return NextResponse.json({ error: "The state proposal action is invalid." }, { status: 400 });
  }

  try {
    const context = selectedWorkspaceProject(repoRoot);
    if (context.projectId !== projectId) {
      throw new ProposalApiError("The selected Project changed. Refresh before reviewing the proposal.", true);
    }
    const args = ["decide", proposalId, decision, reason];
    if (overridePolicy) args.push("--override-policy");
    await runProposalCommand(repoRoot, args);
    const proposals = await readProposals(repoRoot, projectId);
    return NextResponse.json({ ok: true, proposals }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const proposalError = error instanceof ProposalApiError ? error : undefined;
    return NextResponse.json(
      { error: proposalError?.message || "Could not record the learner state decision safely." },
      { status: proposalError?.conflict ? 409 : 500 },
    );
  }
}
