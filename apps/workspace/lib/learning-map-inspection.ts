import type {
  LearningEdgeRelation,
  LearningMapView,
  MasteryState,
} from "./types.ts";

export interface LearningMapConnectionInspection {
  edgeId: string;
  nodeId: string;
  label: string;
  relation: LearningEdgeRelation;
  confidence: "low" | "medium" | "high";
}

export interface LearningMapNodeInspection {
  id: string;
  label: string;
  kind: "concept" | "procedure" | "strategy";
  state: MasteryState;
  missionRelevance: "core" | "supporting" | "optional";
  frontier: boolean;
  evidence?: string;
  dependencies: LearningMapConnectionInspection[];
  unlocks: LearningMapConnectionInspection[];
}

export function inspectLearningMapNode(
  map: LearningMapView,
  nodeId: string,
): LearningMapNodeInspection | undefined {
  const node = map.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return undefined;

  const nodeById = new Map(map.nodes.map((candidate) => [candidate.id, candidate]));
  const dependencies = map.edges
    .filter((edge) => edge.target === nodeId)
    .flatMap((edge) => {
      const source = nodeById.get(edge.source);
      return source ? [{
        edgeId: edge.id,
        nodeId: source.id,
        label: source.label,
        relation: edge.relation,
        confidence: edge.confidence,
      }] : [];
    });
  const unlocks = map.edges
    .filter((edge) => edge.source === nodeId)
    .flatMap((edge) => {
      const target = nodeById.get(edge.target);
      return target ? [{
        edgeId: edge.id,
        nodeId: target.id,
        label: target.label,
        relation: edge.relation,
        confidence: edge.confidence,
      }] : [];
    });

  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    state: node.state,
    missionRelevance: node.missionRelevance,
    frontier: map.frontier.includes(node.id),
    evidence: node.evidence,
    dependencies,
    unlocks,
  };
}
