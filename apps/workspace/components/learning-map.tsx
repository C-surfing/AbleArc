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
import { useEffect, useMemo, useState } from "react";
import { layoutLearningMap, type LearningMapPosition } from "@/lib/learning-map-layout";
import type { LearningMapView, LearningNodeKind, MasteryState } from "@/lib/types";

const stateMeta: Record<MasteryState, { glyph: string; label: string }> = {
  unknown: { glyph: "○", label: "Unknown" },
  exposed: { glyph: "◔", label: "Exposed" },
  developing: { glyph: "◐", label: "Developing" },
  stable: { glyph: "●", label: "Stable" },
  transferable: { glyph: "◆", label: "Transferable" },
};

type ConceptNodeData = {
  label: string;
  state: MasteryState;
  frontier: boolean;
  kind: LearningNodeKind;
  missionRelevance: "core" | "supporting" | "optional";
};

function ConceptNode({ data }: NodeProps<Node<ConceptNodeData, "concept">>) {
  const meta = stateMeta[data.state];
  return (
    <div className={`map-node map-node--${data.state} map-node--${data.kind} ${data.frontier ? "map-node--frontier" : ""}`}>
      <Handle type="target" position={Position.Top} className="map-handle" />
      <div className="map-node__state" aria-label={meta.label}>{meta.glyph}</div>
      <div className="map-node__content">
        <span>{data.label}</span>
        <small>{data.frontier ? "YOU ARE HERE" : `${data.kind} · ${data.missionRelevance}`}</small>
      </div>
      <Handle type="source" position={Position.Bottom} className="map-handle" />
    </div>
  );
}

const nodeTypes = { concept: ConceptNode };

export function LearningMap({ map }: { map: LearningMapView }) {
  const [positions, setPositions] = useState<LearningMapPosition[] | null | undefined>();
  const layoutIdentity = `${map.revision ?? map.source}:${map.nodes.map((node) => node.id).join(",")}:${map.edges.map((edge) => edge.id).join(",")}`;

  useEffect(() => {
    let cancelled = false;
    setPositions(undefined);
    layoutLearningMap(map)
      .then((next) => {
        if (!cancelled) setPositions(next);
      })
      .catch(() => {
        if (!cancelled) setPositions(null);
      });
    return () => { cancelled = true; };
  }, [layoutIdentity, map]);

  const { nodes, edges } = useMemo(() => {
    const positionById = new Map((positions || []).map((position) => [position.id, position]));
    const flowNodes: Node<ConceptNodeData, "concept">[] = map.nodes.map((node) => ({
      id: node.id,
      type: "concept",
      position: positionById.get(node.id) || { x: 0, y: 0 },
      data: {
        label: node.label,
        state: node.state,
        frontier: map.frontier.includes(node.id),
        kind: node.kind,
        missionRelevance: node.missionRelevance,
      },
      draggable: false,
      selectable: true,
    }));
    const flowEdges: Edge[] = map.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      label: edge.relation === "prerequisite" ? undefined : edge.relation,
      className: `map-edge map-edge--${edge.confidence}`,
      labelStyle: { fill: "#747775", fontSize: 8, fontWeight: 700 },
    }));
    return { nodes: flowNodes, edges: flowEdges };
  }, [map, positions]);

  if (map.nodes.length === 0) {
    return (
      <div className="learning-map learning-map--empty">
        <strong>No map invented yet</strong>
        <span>Your first evidence-bearing Teach move will establish the nearest useful concepts.</span>
      </div>
    );
  }

  if (positions === undefined) {
    return (
      <div className="learning-map learning-map--loading" aria-live="polite">
        <span>Arranging the evidence-grounded route…</span>
      </div>
    );
  }

  if (positions === null) {
    return (
      <div className="learning-map learning-map--empty" role="alert">
        <strong>Map layout unavailable</strong>
        <span>The semantic map is retained; reload after checking the topology.</span>
      </div>
    );
  }

  return (
    <div className="learning-map-shell">
      <div className="learning-map__meta">
        <span>{map.source === "structured" ? `MAP REVISION ${map.revision}` : "LEGACY MAP PROJECTION"}</span>
        {map.rationale ? <p title={map.rationale}>{map.rationale}</p> : null}
      </div>
      <div className="learning-map" aria-label="Learning roadmap">
        <ReactFlow
          key={layoutIdentity}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.35}
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
    </div>
  );
}
