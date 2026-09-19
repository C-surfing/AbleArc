import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeAssistantHostRequest } from "@/lib/assistant-host-auth";
import {
  readLearnerProfile,
  writeLearnerProfile,
  type LearnerProfilePatch,
} from "@/lib/learner-profile";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function learnerPath(): string {
  return path.join(findRepoRoot(), ".learning", "LEARNER.md");
}

export async function GET(request: NextRequest) {
  if (!authorizeAssistantHostRequest(request)) {
    return NextResponse.json({ error: "Learner Profile authorization is required." }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, profile: readLearnerProfile(learnerPath()) });
  } catch {
    return NextResponse.json({ error: "Could not read the Learner Profile safely." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorizeAssistantHostRequest(request)) {
    return NextResponse.json({ error: "Learner Profile authorization is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a Learner Profile update object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  if (!Number.isInteger(payload.expectedRevision) || Number(payload.expectedRevision) < 0) {
    return NextResponse.json({ error: "expectedRevision is invalid." }, { status: 400 });
  }
  if (!payload.profile || typeof payload.profile !== "object" || Array.isArray(payload.profile)) {
    return NextResponse.json({ error: "profile is required." }, { status: 400 });
  }

  try {
    const profile = writeLearnerProfile(
      learnerPath(),
      payload.profile as LearnerProfilePatch,
      Number(payload.expectedRevision),
    );
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update Learner Profile.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Refresh before saving") ? 409 : 400 },
    );
  }
}
