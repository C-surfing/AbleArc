"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { inspectLearningMapNode } from "@/lib/learning-map-inspection";
import { layoutLearningMap, type LearningMapPosition } from "@/lib/learning-map-layout";
import type { LearningMapView, LearningNodeKind, MasteryState } from "@/lib/types";
import { MapNodeHistory } from "./map-node-history";
import styles from "./map-inspection.module.css";

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

export function LearningMap({
  map,
  expanded = false,
  projectId,
}: {
  map: LearningMapView;
  expanded?: boolean;
  projectId?: string;
}) {
  const [positions, setPositions] = useState<LearningMapPosition[] | null | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
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

  useEffect(() => {
    if (!expanded) {
      setSelectedNodeId(undefined);
      return;
    }
    setSelectedNodeId((current) => {
      if (current && map.nodes.some((node) => node.id === current)) return current;
      return map.frontier.find((id) => map.nodes.some((node) => node.id === id)) || map.nodes[0]?.id;
    });
  }, [expanded, layoutIdentity, map.frontier, map.nodes]);

  const inspection = useMemo(
    () => selectedNodeId ? inspectLearningMapNode(map, selectedNodeId) : undefined,
    [map, selectedNodeId],
  );

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
      selectable: expanded,
      selected: expanded && node.id === selectedNodeId,
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
  }, [expanded, map, positions, selectedNodeId]);

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
    <div className={`learning-map-shell ${expanded ? styles.expandedShell : ""}`}>
      <div className="learning-map__meta">
        <span>{map.source === "structured" ? `MAP REVISION ${map.revision}` : "LEGACY MAP PROJECTION"}</span>
        {map.rationale ? <p title={map.rationale}>{map.rationale}</p> : null}
      </div>
      <div className={`learning-map ${expanded ? styles.expandedMap : ""}`} aria-label="Learning roadmap">
        <ReactFlow
          key={layoutIdentity}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: expanded ? 0.12 : 0.2 }}
          minZoom={0.25}
          maxZoom={expanded ? 1.65 : 1.15}
          nodesConnectable={false}
          panOnScroll
          zoomOnScroll={expanded}
          zoomOnPinch
          onNodeClick={expanded ? (_event, node) => setSelectedNodeId(node.id) : undefined}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} size={1} className="map-background" />
          {expanded ? <Controls showInteractive={false} /> : null}
        </ReactFlow>
      </div>
      {expanded ? (
        <aside className={styles.inspector} aria-label="Selected map node inspection">
          {inspection ? (
            <>
              <div className={styles.inspectorHeader}>
                <div>
                  <span className="section-kicker">Selected node</span>
                  <h2>{inspection.label}</h2>
                </div>
                <span className={`state-pill state-pill--${inspection.state}`}>
                  {stateMeta[inspection.state].glyph} {stateMeta[inspection.state].label}
                </span>
              </div>
              <div className={styles.facts}>
                <span>{inspection.kind}</span>
                <span>{inspection.missionRelevance} mission relevance</span>
                {inspection.frontier ? <strong>Current frontier</strong> : null}
              </div>
              <section>
                <strong>Accepted learner overlay</strong>
                <p>{inspection.evidence || "No accepted Evidence is attached to this node yet."}</p>
              </section>
              <section>
                <strong>Depends on</strong>
                {inspection.dependencies.length ? inspection.dependencies.map((item) => (
                  <button type="button" key={item.edgeId} onClick={() => setSelectedNodeId(item.nodeId)}>
                    <span>{item.label}</span>
                    <small>{item.relation.replaceAll("_", " ")} · {item.confidence} confidence</small>
                  </button>
                )) : <p>No incoming semantic dependency is recorded.</p>}
              </section>
              <section>
                <strong>What this unlocks</strong>
                {inspection.unlocks.length ? inspection.unlocks.map((item) => (
                  <button type="button" key={item.edgeId} onClick={() => setSelectedNodeId(item.nodeId)}>
                    <span>{item.label}</span>
                    <small>{item.relation.replaceAll("_", " ")} · {item.confidence} confidence</small>
                  </button>
                )) : <p>No outgoing semantic dependency is recorded.</p>}
              </section>
              {projectId && selectedNodeId ? (
                <MapNodeHistory projectId={projectId} nodeId={selectedNodeId} />
              ) : null}
              <p className={styles.boundary}>
                Dependencies and revision history describe the topology hypothesis. Mastery is the accepted Runtime overlay; inspecting either changes neither authority.
              </p>
            </>
          ) : <p>Select a node to inspect its dependencies and accepted learner overlay.</p>}
        </aside>
      ) : null}
    </div>
  );
}
