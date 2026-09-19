import { NextResponse, type NextRequest } from "next/server";
import {
  providerSettingsMetadata,
  readStoredProviderSettings,
  removeStoredProviderSettings,
  writeStoredProviderSettings,
  type ProviderSettingsInput,
} from "@/lib/provider-settings";
import { sameOrigin } from "@/lib/server-request";
import { findRepoRoot } from "@/lib/workspace-data";
import { getWorkspaceProviderStatus } from "@/lib/workspace-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const repoRoot = findRepoRoot();
  try {
    return NextResponse.json({
      ok: true,
      settings: providerSettingsMetadata(repoRoot),
      status: getWorkspaceProviderStatus(repoRoot),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read Provider settings safely." },
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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a Provider settings request." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const repoRoot = findRepoRoot();

  try {
    if (payload.action === "remove") {
      removeStoredProviderSettings(repoRoot);
      return NextResponse.json({
        ok: true,
        settings: providerSettingsMetadata(repoRoot),
        status: getWorkspaceProviderStatus(repoRoot),
      });
    }
    if (payload.action !== "save") {
      return NextResponse.json({ error: "Provider settings action is invalid." }, { status: 400 });
    }

    const existing = readStoredProviderSettings(repoRoot);
    const submittedKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
    const settings = writeStoredProviderSettings(repoRoot, {
      apiKey: submittedKey || existing?.apiKey || "",
      model: payload.model as string,
      baseUrl: payload.baseUrl as string,
      structuredOutput: payload.structuredOutput as ProviderSettingsInput["structuredOutput"],
      timeoutMs: Number(payload.timeoutMs),
    });
    return NextResponse.json({
      ok: true,
      settings: {
        configured: true,
        source: "web",
        adapter: settings.adapter,
        model: settings.model,
        baseUrl: settings.baseUrl,
        structuredOutput: settings.structuredOutput,
        timeoutMs: settings.timeoutMs,
        updatedAt: settings.updatedAt,
      },
      status: getWorkspaceProviderStatus(repoRoot),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save Provider settings." },
      { status: 400 },
    );
  }
}
