import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { parseCompletionGateStatus } from "@/lib/completion-status";
import { resolveProjectReadContext } from "@/lib/project-store";
import { sameOrigin } from "@/lib/server-request";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const MAX_STDOUT_BYTES = 512 * 1024;
const MAX_STDERR_BYTES = 32 * 1024;

class CompletionApiError extends Error {
  constructor(message: string, readonly conflict = false) {
    super(message);
    this.name = "CompletionApiError";
  }
}
function runCompletionCommand(repoRoot: string, args: string[]): Promise<unknown> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learning.py");
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, ...args],
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
      if (Buffer.byteLength(stderr, "utf8") < MAX_STDERR_BYTES) {
        stderr += chunk.toString("utf8");
      }
    });
    child.on("error", () => {
      reject(new CompletionApiError("The local Completion Gate could not start."));
    });
    child.on("close", (code) => {
      if (oversized) {
        reject(new CompletionApiError("The local Completion Gate returned too much data."));
        return;
      }
      if (code !== 0) {
        const conflict = stderr.includes("not satisfied")
          || stderr.includes("pending learner response")
          || stderr.includes("selected Project changed")
          || stderr.includes("requires an active Project");
        reject(new CompletionApiError(
          conflict
            ? "The Completion Gate is not ready for this Project. Refresh its evidence status."
            : "The local Completion Gate rejected the request.",
          conflict,
        ));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new CompletionApiError("The local Completion Gate returned invalid JSON."));
      }
    });
  });
}

async function readStatus(repoRoot: string, projectId: string) {
  const value = await runCompletionCommand(repoRoot, ["completion-status"]);
  return parseCompletionGateStatus(value, projectId);
}

function selectedWorkspaceProject(repoRoot: string) {
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2" || !context.missionId) {
    throw new CompletionApiError("Mission completion requires a selected workspace Project.");
  }
  return context;
}

export async function GET() {
  const repoRoot = findRepoRoot();
  try {
    const context = selectedWorkspaceProject(repoRoot);
    const completion = await readStatus(repoRoot, context.projectId);
    return NextResponse.json({ completion }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Completion status is unavailable." },
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
    return NextResponse.json({ error: "Expected a completion action object." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
  if (payload.action !== "complete" || !PROJECT_ID.test(projectId)) {
    return NextResponse.json({ error: "The completion action is invalid." }, { status: 400 });
  }

  const repoRoot = findRepoRoot();
  try {
    const context = selectedWorkspaceProject(repoRoot);
    if (context.projectId !== projectId) {
      throw new CompletionApiError("The selected Project changed. Refresh before completing it.", true);
    }
    await runCompletionCommand(repoRoot, ["complete-project", projectId]);
    const completion = await readStatus(repoRoot, projectId);
    return NextResponse.json({ ok: true, completion });
  } catch (error) {
    const completionError = error instanceof CompletionApiError ? error : undefined;
    return NextResponse.json(
      { error: completionError?.message || "Could not complete the local Project safely." },
      { status: completionError?.conflict ? 409 : 500 },
    );
  }
}
