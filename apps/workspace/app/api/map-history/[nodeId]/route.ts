import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseLearningMapNodeHistory } from "@/lib/learning-map-history";
import { resolveProjectReadContext } from "@/lib/project-store";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NODE_ID = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,126}[A-Za-z0-9])?$/;
const MAX_STDOUT_BYTES = 512 * 1024;
const MAX_STDERR_BYTES = 32 * 1024;

class MapHistoryApiError extends Error {}

function selectedWorkspaceProject(repoRoot: string) {
  const context = resolveProjectReadContext(repoRoot);
  if (!context || context.layout !== "workspace-v0.2") {
    throw new MapHistoryApiError("LearningMap history requires a selected workspace Project.");
  }
  return context;
}

function runHistoryCommand(repoRoot: string, nodeId: string): Promise<unknown> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learning_map_history.py");
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, "--repo", repoRoot, "node", nodeId, "--limit", "20"],
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
    child.on("error", () => reject(new MapHistoryApiError("The local LearningMap history reader could not start.")));
    child.on("close", (code) => {
      if (oversized) {
        reject(new MapHistoryApiError("The LearningMap history reader returned too much data."));
        return;
      }
      if (code !== 0) {
        reject(new MapHistoryApiError(
          stderr.includes("does not match immutable history")
            ? "LearningMap history integrity check failed."
            : "LearningMap node history is unavailable.",
        ));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new MapHistoryApiError("The LearningMap history reader returned invalid JSON."));
      }
    });
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  if (!NODE_ID.test(nodeId)) {
    return NextResponse.json(
      { error: "The LearningMap node id is invalid." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  const repoRoot = findRepoRoot();
  try {
    const context = selectedWorkspaceProject(repoRoot);
    const raw = await runHistoryCommand(repoRoot, nodeId);
    const history = parseLearningMapNodeHistory(raw, context.projectId, nodeId);
    return NextResponse.json(
      { history },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LearningMap node history is unavailable." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
}
