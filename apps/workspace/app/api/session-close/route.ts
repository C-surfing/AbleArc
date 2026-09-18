import { NextResponse, type NextRequest } from "next/server";
import { deriveSessionClose } from "@/lib/session-close";
import { readSessionClose, writeSessionClose } from "@/lib/session-close-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const runtime = "nodejs";

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
    return NextResponse.json({ close: readSessionClose(findRepoRoot()) ?? null });
  } catch {
    return NextResponse.json({ error: "Could not read Session Close safely." }, { status: 500 });
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
    return NextResponse.json({ error: "Expected a Session Close request." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (
    Object.keys(input).length !== 1
    || !Number.isSafeInteger(input.expectedRevision)
    || Number(input.expectedRevision) < 0
  ) {
    return NextResponse.json({ error: "Session Close expected revision is invalid." }, { status: 400 });
  }

  try {
    const repoRoot = findRepoRoot();
    const draft = deriveSessionClose(loadWorkspaceSnapshot());
    const close = writeSessionClose(repoRoot, draft, Number(input.expectedRevision));
    return NextResponse.json({ ok: true, close });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = message.includes("changed before") || message.includes("already in progress");
    const unavailable = message.includes("requires an assessed learner response");
    return NextResponse.json(
      {
        error: conflict
          ? "Session Close changed before this save completed. Refresh and try again."
          : unavailable
            ? "Finish and assess one learner response before closing this session."
            : "Could not save Session Close safely.",
      },
      { status: conflict ? 409 : unavailable ? 400 : 500 },
    );
  }
}
