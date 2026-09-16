import type {
  LearningEdgeRelation,
  LearningMapView,
  LearningNodeKind,
  RoadmapEdge,
  RoadmapNode,
} from "./types";

function exactObjectKeys(value: Record<string, unknown>, fields: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isLocalId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value);
}

function isUniqueLocalIdList(value: unknown, maximum: number): value is string[] {
  return Array.isArray(value)
    && value.length <= maximum
    && value.every(isLocalId)
    && new Set(value).size === value.length;
}

/** Validate the canonical topology before joining any learner-state overlay. */
export function parseCanonicalLearningMap(input: unknown, projectId: string): LearningMapView {
  const value = input as Record<string, unknown> | null;
  const revision = value?.revision;
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || !exactObjectKeys(value, [
      "schema_version", "kind", "project_id", "revision", "parent_revision",
      "created_at", "updated_at", "rationale", "evidence_ids", "frontier",
      "nodes", "edges", "delta",
    ])
    || value.schema_version !== "0.1"
    || value.kind !== "learning-map"
    || value.project_id !== projectId
    || !Number.isInteger(revision)
    || Number(revision) < 0
    || (revision === 0 ? value.parent_revision !== null : value.parent_revision !== Number(revision) - 1)
    || typeof value.created_at !== "string"
    || !value.created_at
    || typeof value.updated_at !== "string"
    || !value.updated_at
    || typeof value.rationale !== "string"
    || !value.rationale
    || value.rationale.length > 1600
    || !Array.isArray(value.evidence_ids)
    || value.evidence_ids.length > 50
    || value.evidence_ids.some((item) => typeof item !== "string" || !/^ev_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/.test(item))
    || new Set(value.evidence_ids).size !== value.evidence_ids.length
    || !Array.isArray(value.frontier)
    || !Array.isArray(value.nodes)
    || value.nodes.length > 500
    || !Array.isArray(value.edges)
    || value.edges.length > 2000
  ) throw new Error("The canonical LearningMap is invalid.");

  const delta = value.delta as Record<string, unknown> | null;
  const deltaLists = [
    "added_node_ids", "removed_node_ids", "changed_node_ids",
    "added_edge_ids", "removed_edge_ids", "changed_edge_ids",
  ];
  if (
    !delta
    || typeof delta !== "object"
    || Array.isArray(delta)
    || !exactObjectKeys(delta, [...deltaLists, "frontier_changed"])
    || deltaLists.some((field) => !isUniqueLocalIdList(delta[field], 2000))
    || typeof delta.frontier_changed !== "boolean"
  ) throw new Error("The canonical LearningMap delta is invalid.");
  const hasDelta = deltaLists.some((field) => (delta[field] as string[]).length > 0)
    || delta.frontier_changed;
  if (
    (revision === 0 && (
      value.evidence_ids.length > 0
      || value.frontier.length > 0
      || value.nodes.length > 0
      || value.edges.length > 0
      || hasDelta
    ))
    || (Number(revision) > 0 && (
      value.evidence_ids.length === 0
      || value.frontier.length === 0
      || value.nodes.length === 0
      || !hasDelta
    ))
  ) throw new Error("The canonical LearningMap revision is invalid.");

  const validKinds: LearningNodeKind[] = ["concept", "procedure", "strategy"];
  const validRelevance = ["core", "supporting", "optional"];
  const nodeIds = new Set<string>();
  const nodes = value.nodes.map((item, index): RoadmapNode => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`LearningMap node ${index + 1} is invalid.`);
    }
    const node = item as Record<string, unknown>;
    if (
      !exactObjectKeys(node, ["id", "label", "kind", "mission_relevance"])
      || !isLocalId(node.id)
      || nodeIds.has(node.id)
      || typeof node.label !== "string"
      || !node.label.trim()
      || node.label.length > 200
      || !validKinds.includes(node.kind as LearningNodeKind)
      || !validRelevance.includes(String(node.mission_relevance))
    ) throw new Error(`LearningMap node ${index + 1} is invalid.`);
    nodeIds.add(node.id);
    return {
      id: node.id,
      label: node.label,
      kind: node.kind as LearningNodeKind,
      missionRelevance: node.mission_relevance as RoadmapNode["missionRelevance"],
      state: "unknown",
    };
  });

  const validRelations: LearningEdgeRelation[] = ["prerequisite", "component", "prepares", "contrast", "transfer"];
  const validConfidence = ["low", "medium", "high"];
  const edgeIds = new Set<string>();
  const edges = value.edges.map((item, index): RoadmapEdge => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`LearningMap edge ${index + 1} is invalid.`);
    }
    const edge = item as Record<string, unknown>;
    if (
      !exactObjectKeys(edge, ["id", "source", "target", "relation", "confidence"])
      || !isLocalId(edge.id)
      || edgeIds.has(edge.id)
      || typeof edge.source !== "string"
      || typeof edge.target !== "string"
      || edge.source === edge.target
      || !nodeIds.has(edge.source)
      || !nodeIds.has(edge.target)
      || !validRelations.includes(edge.relation as LearningEdgeRelation)
      || !validConfidence.includes(String(edge.confidence))
    ) throw new Error(`LearningMap edge ${index + 1} is invalid.`);
    edgeIds.add(edge.id);
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relation: edge.relation as LearningEdgeRelation,
      confidence: edge.confidence as RoadmapEdge["confidence"],
    };
  });

  if (!isUniqueLocalIdList(value.frontier, 12)) throw new Error("LearningMap frontier is invalid.");
  const frontier = value.frontier;
  if (frontier.some((id) => !nodeIds.has(id))) throw new Error("LearningMap frontier is invalid.");
  return {
    source: "structured",
    revision: Number(revision),
    rationale: value.rationale,
    frontier,
    nodes,
    edges,
  };
}
