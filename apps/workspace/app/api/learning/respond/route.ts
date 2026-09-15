import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";

const DECISION_ID = /^dec_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const ARTIFACT_ID = /^art_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const OPTION_ID = /^[a-z][a-z0-9_-]{0,31}$/;
const MAX_RESPONSE_LENGTH = 12000;

interface ArtifactInteractionPayload {
  artifact_id: string;
  prediction_id: string;
  initial_prevalence: number;
  final_prevalence: number;
}

function recordResponse(
  repoRoot: string,
  decisionId: string,
  response: string,
  artifactInteraction?: ArtifactInteractionPayload,
): Promise<string> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "runtime.py");

  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, "--repo", repoRoot, "respond-context", decisionId, "-"],
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
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `runtime exited with code ${code}`));
    });
    child.stdin.end(JSON.stringify({ response, artifact_interaction: artifactInteraction }), "utf8");
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

  const payload = body as { decisionId?: unknown; response?: unknown; artifactInteraction?: unknown };
  const decisionId = typeof payload.decisionId === "string" ? payload.decisionId : "";
  const response = typeof payload.response === "string" ? payload.response.trim() : "";

  if (!DECISION_ID.test(decisionId)) {
    return NextResponse.json({ error: "The current learning move is invalid or missing." }, { status: 400 });
  }
  if (!response) {
    return NextResponse.json({ error: "Write a response before submitting." }, { status: 400 });
  }
  if (response.length > MAX_RESPONSE_LENGTH) {
    return NextResponse.json(
      { error: `Keep the response under ${MAX_RESPONSE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  let artifactInteraction: ArtifactInteractionPayload | undefined;
  if (payload.artifactInteraction !== undefined) {
    const item = payload.artifactInteraction as Record<string, unknown>;
    const artifactId = typeof item?.artifactId === "string" ? item.artifactId : "";
    const predictionId = typeof item?.predictionId === "string" ? item.predictionId : "";
    const initialPrevalence = item?.initialPrevalence;
    const finalPrevalence = item?.finalPrevalence;
    if (
      !ARTIFACT_ID.test(artifactId)
      || !OPTION_ID.test(predictionId)
      || typeof initialPrevalence !== "number"
      || typeof finalPrevalence !== "number"
      || !Number.isFinite(initialPrevalence)
      || !Number.isFinite(finalPrevalence)
    ) {
      return NextResponse.json({ error: "The learning artifact interaction is invalid." }, { status: 400 });
    }
    artifactInteraction = {
      artifact_id: artifactId,
      prediction_id: predictionId,
      initial_prevalence: initialPrevalence,
      final_prevalence: finalPrevalence,
    };
  }

  try {
    const output = await recordResponse(findRepoRoot(), decisionId, response, artifactInteraction);
    const receipt = JSON.parse(output) as { id: string };
    return NextResponse.json({ ok: true, observationId: receipt.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the response.";
    const conflict = message.includes("already has a learner response");
    return NextResponse.json(
      { error: conflict ? "This learning move already has a response." : "Could not save locally. Check the runtime setup." },
      { status: conflict ? 409 : 500 },
    );
  }
}
