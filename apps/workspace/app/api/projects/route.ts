import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";

const PROJECT_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const ACTION_COMMANDS = {
  switch: "switch-project",
  pause: "pause-project",
  resume: "resume-project",
  archive: "archive-project",
  "maintenance-start": "maintenance-start",
} as const;

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

function runLearningTool(
  repoRoot: string,
  args: string[],
  input?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learning.py");
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, ...args],
      { cwd: repoRoot, stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `learning tool exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as Record<string, unknown>);
      } catch {
        reject(new Error("learning tool returned invalid JSON"));
      }
    });
    child.stdin.end(input ? JSON.stringify(input) : undefined, "utf8");
  });
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
    return NextResponse.json({ error: "Expected a Project action object." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : "";
  const repoRoot = findRepoRoot();

  try {
    if (action === "create") {
      const title = typeof payload.title === "string" ? payload.title.trim() : "";
      const goal = typeof payload.goal === "string" ? payload.goal.trim() : "";
      const why = typeof payload.why === "string" ? payload.why.trim() : "";
      const projectId = typeof payload.projectId === "string" ? payload.projectId.trim() : "";
      if (!title || !goal) {
        return NextResponse.json(
          { error: "Give the Project a title and an observable capability goal." },
          { status: 400 },
        );
      }
      if (title.length > 200 || goal.length > 1200 || why.length > 2400) {
        return NextResponse.json(
          { error: "Keep the Project title and Mission concise." },
          { status: 400 },
        );
      }
      if (projectId && !PROJECT_ID.test(projectId)) {
        return NextResponse.json(
          { error: "The optional Project identifier must be a portable lowercase ASCII slug." },
          { status: 400 },
        );
      }
      const result = await runLearningTool(
        repoRoot,
        ["create-project", "-"],
        {
          title,
          goal,
          why,
          ...(projectId ? { project_id: projectId } : {}),
        },
      );
      return NextResponse.json({ ok: true, result });
    }

    const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
    if (!PROJECT_ID.test(projectId)) {
      return NextResponse.json({ error: "The Project identifier is invalid." }, { status: 400 });
    }

    if (!Object.hasOwn(ACTION_COMMANDS, action)) {
      return NextResponse.json({ error: "Unsupported Project action." }, { status: 400 });
    }
    const command = ACTION_COMMANDS[action as keyof typeof ACTION_COMMANDS];
    const result = await runLearningTool(repoRoot, [command, projectId]);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const legacy = message.includes("must be migrated");
    const conflict = message.includes("current status")
      || message.includes("already")
      || message.includes("only for archived")
      || message.includes("maintenance-start");
    return NextResponse.json(
      {
        error: legacy
          ? "Migrate the legacy workspace before creating another Project."
          : conflict
            ? "The Project changed before this action completed. Refresh and try again."
            : "Could not update the local Project safely.",
      },
      { status: legacy || conflict ? 409 : 500 },
    );
  }
}
