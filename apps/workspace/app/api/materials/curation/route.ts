import { NextResponse, type NextRequest } from "next/server";
import { readMaterialCuration, setMaterialCuration } from "@/lib/material-curation-store";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const curation = readMaterialCuration(findRepoRoot());
    return NextResponse.json(
      { curation },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Material curation is unavailable." },
      { status: 404, headers: { "cache-control": "no-store" } },
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
    return NextResponse.json({ error: "Expected a material curation action object." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  if (
    typeof payload.projectId !== "string"
    || typeof payload.revision !== "number"
    || typeof payload.materialId !== "string"
    || typeof payload.selected !== "boolean"
  ) {
    return NextResponse.json({ error: "Material curation action is invalid." }, { status: 400 });
  }

  try {
    const curation = setMaterialCuration(findRepoRoot(), {
      expectedProjectId: payload.projectId,
      expectedRevision: payload.revision,
      materialId: payload.materialId,
      selected: payload.selected,
    });
    return NextResponse.json(
      { ok: true, curation },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Material curation could not be saved.";
    const conflict = message.includes("changed before") || message.includes("lifecycle write");
    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : 400, headers: { "cache-control": "no-store" } },
    );
  }
}
