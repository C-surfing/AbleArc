import { NextResponse } from "next/server";
import { readLearningMaterialDetail } from "@/lib/learning-material-reader";
import { findRepoRoot } from "@/lib/workspace-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const material = readLearningMaterialDetail(findRepoRoot(), id);
    return NextResponse.json(
      { material },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LearningMaterial detail is unavailable." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
}
