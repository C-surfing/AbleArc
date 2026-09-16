import assert from "node:assert/strict";
import test from "node:test";
import { layoutLearningMap } from "./learning-map-layout.ts";
import type { LearningMapView } from "./types.ts";

const map: LearningMapView = {
  source: "structured",
  revision: 1,
  rationale: "Test route",
  frontier: ["apply"],
  nodes: [
    { id: "basis", label: "Basis", kind: "concept", state: "stable", missionRelevance: "supporting" },
    { id: "transform", label: "Transform", kind: "procedure", state: "developing", missionRelevance: "core" },
    { id: "apply", label: "Apply", kind: "strategy", state: "unknown", missionRelevance: "core" },
  ],
  edges: [
    { id: "basis-transform", source: "basis", target: "transform", relation: "prerequisite", confidence: "high" },
    { id: "transform-apply", source: "transform", target: "apply", relation: "prepares", confidence: "medium" },
  ],
};

test("ELK layout is deterministic and follows dependency layers", async () => {
  const first = await layoutLearningMap(map);
  const second = await layoutLearningMap(map);
  assert.deepEqual(first, second);
  assert.deepEqual(new Set(first.map((item) => item.id)), new Set(["basis", "transform", "apply"]));
  const positions = new Map(first.map((item) => [item.id, item]));
  assert.ok(positions.get("basis")!.y < positions.get("transform")!.y);
  assert.ok(positions.get("transform")!.y < positions.get("apply")!.y);
});
