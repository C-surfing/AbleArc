import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { resolveProjectReadContext } from "@/lib/project-store";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";

const MAX_GOAL_LENGTH = 1200;
const MAX_CONTEXT_LENGTH = 2400;

function saveMission(
  repoRoot: string,
  title: string,
  goal: string,
  context: string,
): Promise<void> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learning.py");

  const storage = resolveProjectReadContext(repoRoot);
  if (storage?.layout === "workspace-v0.2") {
    return Promise.reject(new Error("an active Project already exists"));
  }
  const createProject = storage === undefined;
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, createProject ? "create-project" : "start-mission", "-"],
      { cwd: repoRoot, stdio: ["pipe", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `learning tool exited with code ${code}`));
    });
    child.stdin.end(JSON.stringify(
      createProject
        ? { title, goal, why: context }
        : { goal, context },
    ), "utf8");
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    if (origin && new URL(origin).host !== requestHost) {
      return NextResponse.json({ error: "Cross-site submissions are not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Cross-site submissions are not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const payload = body as { title?: unknown; goal?: unknown; context?: unknown };
  const goal = typeof payload.goal === "string" ? payload.goal.trim() : "";
  const context = typeof payload.context === "string" ? payload.context.trim() : "";
  const suppliedTitle = typeof payload.title === "string" ? payload.title.trim() : "";
  const title = suppliedTitle || goal.slice(0, 80);
  if (!goal) {
    return NextResponse.json({ error: "Describe what you want to become able to do." }, { status: 400 });
  }
  if (title.length > 200 || goal.length > MAX_GOAL_LENGTH || context.length > MAX_CONTEXT_LENGTH) {
    return NextResponse.json({ error: "Keep the mission concise enough to guide one learning route." }, { status: 400 });
  }

  try {
    await saveMission(findRepoRoot(), title, goal, context);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = message.includes("mission already started")
      || message.includes("active Project already exists");
    return NextResponse.json(
      { error: conflict
        ? "A learning mission already exists. Edit it explicitly instead of replacing it from onboarding."
        : "Could not save the mission locally. Check the workspace setup." },
      { status: conflict ? 409 : 500 },
    );
  }
}
