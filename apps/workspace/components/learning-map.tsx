"use client";

import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMemo } from "react";
import type { MasteryState, RoadmapNode } from "@/lib/types";

const stateMeta: Record<MasteryState, { glyph: string; label: string }> = {
  unknown: { glyph: "○", label: "Unknown" },
  exposed: { glyph: "◔", label: "Exposed" },
  developing: { glyph: "◐", label: "Developing" },
  stable: { glyph: "●", label: "Stable" },
  transferable: { glyph: "◆", label: "Transferable" },
};

type ConceptNodeData = { label: string; state: MasteryState; frontier: boolean };

function ConceptNode({ data }: NodeProps<Node<ConceptNodeData, "concept">>) {
  const meta = stateMeta[data.state];
  return (
    <div className={`map-node map-node--${data.state} ${data.frontier ? "map-node--frontier" : ""}`}>
      <Handle type="target" position={Position.Top} className="map-handle" />
      <div className="map-node__state" aria-label={meta.label}>{meta.glyph}</div>
      <div className="map-node__content">
        <span>{data.label}</span>
        {data.frontier ? <small>YOU ARE HERE</small> : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="map-handle" />
    </div>
  );
}

const nodeTypes = { concept: ConceptNode };

export function LearningMap({ nodes: roadmap, frontier }: { nodes: RoadmapNode[]; frontier: string }) {
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node<ConceptNodeData, "concept">[] = roadmap.map((node, index) => ({
      id: node.id,
      type: "concept",
      position: { x: 16 + (index % 2) * 22, y: index * 98 },
      data: {
        label: node.label,
        state: node.state,
        frontier: node.label === frontier || node.id === "frontier",
      },
      draggable: false,
      selectable: true,
    }));

    const ids = new Set(roadmap.map((node) => node.id));
    const labelToId = new Map(roadmap.map((node) => [node.label.toLowerCase(), node.id]));
    const flowEdges: Edge[] = roadmap.slice(1).map((node, index) => {
      const dependency = node.dependsOn;
      const source = dependency && ids.has(dependency)
        ? dependency
        : dependency && labelToId.has(dependency.toLowerCase())
          ? labelToId.get(dependency.toLowerCase())!
          : roadmap[index].id;
      return {
        id: `${source}->${node.id}`,
        source,
        target: node.id,
        type: "smoothstep",
        className: "map-edge",
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [roadmap, frontier]);

  if (roadmap.length === 0) {
    return (
      <div className="learning-map learning-map--empty">
        <strong>No map invented yet</strong>
        <span>Your first evidence-bearing Teach move will establish the nearest useful concepts.</span>
      </div>
    );
  }

  return (
    <div className="learning-map" aria-label="Learning roadmap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.15}
        nodesConnectable={false}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} className="map-background" />
      </ReactFlow>
    </div>
  );
}
