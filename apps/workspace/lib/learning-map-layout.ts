import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { LearningMapView } from "./types";

export interface LearningMapPosition {
  id: string;
  x: number;
  y: number;
}

const elk = new ELK();
const NODE_WIDTH = 182;
const NODE_HEIGHT = 64;

/** Keep pixels out of the LearningMap IR: ELK deterministically derives them. */
export async function layoutLearningMap(map: LearningMapView): Promise<LearningMapPosition[]> {
  const graph: ElkNode = {
    id: "learning-map",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.spacing.nodeNode": "34",
      "elk.layered.spacing.nodeNodeBetweenLayers": "56",
      "elk.padding": "[top=18,left=18,bottom=18,right=18]",
    },
    children: map.nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: map.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
  const result = await elk.layout(graph);
  return (result.children || []).map((node) => ({
    id: node.id,
    x: node.x || 0,
    y: node.y || 0,
  }));
}
