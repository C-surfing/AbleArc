import { NextResponse, type NextRequest } from "next/server";
import { readDailyContext, writeDailyContext } from "@/lib/daily-context-store";
import { findRepoRoot } from "@/lib/workspace-data";

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
    const context = readDailyContext(findRepoRoot());
    return NextResponse.json({
      context: context ?? null,
      revision: context?.revision ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read DailyContext safely." },
      { status: 500 },
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

  try {
    const context = writeDailyContext(findRepoRoot(), body);
    return NextResponse.json({ ok: true, context });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = message.includes("changed before") || message.includes("already in progress");
    const migration = message.includes("workspace-v0.2");
    const invalid = message.startsWith("DailyContext") && !migration;
    return NextResponse.json(
      {
        error: conflict
          ? "Daily context changed before this update completed. Refresh and try again."
          : migration
            ? "Migrate the legacy workspace before saving DailyContext."
            : invalid
              ? message
              : "Could not save DailyContext safely.",
      },
      { status: conflict || migration ? 409 : invalid ? 400 : 500 },
    );
  }
}
