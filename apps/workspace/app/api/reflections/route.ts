import { NextResponse, type NextRequest } from "next/server";
import { currentReflectionLinks, type ReflectionContextMode, type ReflectionLinks } from "@/lib/reflection";
import {
  createReflection,
  deleteReflection,
  listReflections,
  readReflection,
  updateReflection,
} from "@/lib/reflection-store";
import { sameOrigin } from "@/lib/server-request";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const runtime = "nodejs";

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Reflection request must be an object");
  }
  return value as Record<string, unknown>;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== "string")) {
    throw new Error(label + " is invalid");
  }
  return value as string[];
}

function linksForCreate(materialIds: string[], linkCurrent: boolean): ReflectionLinks {
  if (!linkCurrent) return { conceptIds: [], materialIds };
  return currentReflectionLinks(loadWorkspaceSnapshot(), materialIds);
}

function linksForUpdate(
  repoRoot: string,
  reflectionId: string,
  mode: ReflectionContextMode,
  materialIds: string[],
): ReflectionLinks {
  if (mode === "current") return currentReflectionLinks(loadWorkspaceSnapshot(), materialIds);
  if (mode === "none") return { conceptIds: [], materialIds };
  const current = readReflection(repoRoot, reflectionId);
  return {
    ...(current.links.missionId ? { missionId: current.links.missionId } : {}),
    ...(current.links.decisionId ? { decisionId: current.links.decisionId } : {}),
    conceptIds: current.links.conceptIds,
    materialIds,
  };
}

export function GET() {
  try {
    return NextResponse.json({ reflections: listReflections(findRepoRoot()) });
  } catch {
    return NextResponse.json({ error: "Could not read Reflections safely." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site submissions are not allowed." }, { status: 403 });
  }

  let input: Record<string, unknown>;
  try {
    input = objectBody(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Expected a JSON Reflection request." },
      { status: 400 },
    );
  }

  try {
    const repoRoot = findRepoRoot();
    const action = input.action;
    if (action === "create") {
      const allowed = new Set(["action", "expectedProjectId", "body", "linkCurrent", "materialIds"]);
      if (Object.keys(input).some((key) => !allowed.has(key))) {
        throw new Error("Reflection create request has unsupported fields");
      }
      if (
        typeof input.expectedProjectId !== "string"
        || typeof input.body !== "string"
        || typeof input.linkCurrent !== "boolean"
      ) {
        throw new Error("Reflection create request is invalid");
      }
      const materialIds = stringArray(input.materialIds ?? [], "Reflection material links");
      const reflection = createReflection(
        repoRoot,
        input.body,
        linksForCreate(materialIds, input.linkCurrent),
        input.expectedProjectId,
      );
      return NextResponse.json({ ok: true, reflection });
    }

    if (action === "update") {
      const allowed = new Set([
        "action",
        "expectedProjectId",
        "reflectionId",
        "expectedRevision",
        "body",
        "contextMode",
        "materialIds",
      ]);
      if (Object.keys(input).some((key) => !allowed.has(key))) {
        throw new Error("Reflection update request has unsupported fields");
      }
      if (
        typeof input.expectedProjectId !== "string"
        || typeof input.reflectionId !== "string"
        || !Number.isSafeInteger(input.expectedRevision)
        || typeof input.body !== "string"
        || !["preserve", "current", "none"].includes(String(input.contextMode))
      ) {
        throw new Error("Reflection update request is invalid");
      }
      const materialIds = stringArray(input.materialIds ?? [], "Reflection material links");
      const reflection = updateReflection(
        repoRoot,
        input.reflectionId,
        Number(input.expectedRevision),
        input.body,
        linksForUpdate(
          repoRoot,
          input.reflectionId,
          input.contextMode as ReflectionContextMode,
          materialIds,
        ),
        input.expectedProjectId,
      );
      return NextResponse.json({ ok: true, reflection });
    }

    if (action === "delete") {
      const allowed = new Set(["action", "expectedProjectId", "reflectionId", "expectedRevision"]);
      if (Object.keys(input).some((key) => !allowed.has(key))) {
        throw new Error("Reflection delete request has unsupported fields");
      }
      if (
        typeof input.expectedProjectId !== "string"
        || typeof input.reflectionId !== "string"
        || !Number.isSafeInteger(input.expectedRevision)
      ) {
        throw new Error("Reflection delete request is invalid");
      }
      deleteReflection(
        repoRoot,
        input.reflectionId,
        Number(input.expectedRevision),
        input.expectedProjectId,
      );
      return NextResponse.json({ ok: true });
    }

    throw new Error("Reflection action is invalid");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = message.includes("changed before") || message.includes("already in progress");
    return NextResponse.json(
      {
        error: conflict
          ? "Reflection changed before this request completed. Refresh and try again."
          : message.startsWith("Reflection") || message.startsWith("selected Project")
            ? message
            : "Could not save Reflection safely.",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
