import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { parseLearnerStateReplay } from "@/lib/learner-state-replay";
import { resolveProjectReadContext } from "@/lib/project-store";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const MAX_STDOUT_BYTES = 1024 * 1024;
const MAX_STDERR_BYTES = 32 * 1024;

class ReplayApiError extends Error {}

function selectedProject(repoRoot: string, expectedProjectId: string) {
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2") {
    throw new ReplayApiError("Learner-state replay requires a selected workspace Project.");
  }
  if (context.projectId !== expectedProjectId) {
    throw new ReplayApiError("The selected Project changed. Refresh before reading state replay.");
  }
  return context;
}

function runReplay(repoRoot: string): Promise<unknown> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learner_state_replay.py");
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, "--repo", repoRoot, "--limit", "50"],
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
    child.on("error", () => reject(new ReplayApiError("The local learner-state replay reader could not start.")));
    child.on("close", (code) => {
      if (oversized) {
        reject(new ReplayApiError("Learner-state replay returned too much data."));
        return;
      }
      if (code !== 0) {
        reject(new ReplayApiError(stderr.trim() || "Learner-state replay could not be verified."));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new ReplayApiError("Learner-state replay returned invalid JSON."));
      }
    });
  });
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") || "";
  if (!PROJECT_ID.test(projectId)) {
    return NextResponse.json({ error: "A valid Project id is required." }, { status: 400 });
  }
  const repoRoot = findRepoRoot();
  try {
    selectedProject(repoRoot, projectId);
    const raw = await runReplay(repoRoot);
    const replay = parseLearnerStateReplay(raw, projectId);
    return NextResponse.json({ replay }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Learner-state replay is unavailable." },
      { status: 409, headers: { "cache-control": "no-store" } },
    );
  }
}
