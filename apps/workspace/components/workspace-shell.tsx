"use client";

import { useState } from "react";
import type { WorkspaceSnapshot } from "@/lib/types";
import { LearningMap } from "./learning-map";
import { LearningCanvas } from "./learning-canvas";
import { StatePanel } from "./state-panel";
import { SessionTimeline } from "./session-timeline";
import { ProjectSwitcher } from "./project-switcher";
import { CompletionGate } from "./completion-gate";
import { MapProposalReview } from "./map-proposal-review";
import mapStyles from "./map-inspection.module.css";

type Mode = "Teach" | "Study" | "Map" | "Review";

const modes: { mode: Mode; label: string; hint: string }[] = [
  { mode: "Teach", label: "Learn", hint: "Grow understanding through one reachable move" },
  { mode: "Study", label: "Practice", hint: "Retrieve, repair, and apply" },
  { mode: "Map", label: "Map", hint: "Inspect the learning path" },
  { mode: "Review", label: "Review", hint: "Revisit high-value edges" },
];

export function WorkspaceShell({
  snapshot,
  initialMode = "Teach",
}: {
  snapshot: WorkspaceSnapshot;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pathOpen, setPathOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const mapMode = mode === "Map";

  return (
    <div className={`workspace-shell ${historyOpen ? "has-history" : ""}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">AA</div>
          <div>
            <strong>AbleArc</strong>
            <span>{snapshot.projectTitle || "Learning workspace"}</span>
          </div>
        </div>

        <nav className="mode-nav" aria-label="Learning mode">
          {modes.map((item) => (
            <button
              key={item.mode}
              type="button"
              className={mode === item.mode ? "is-active" : ""}
              onClick={() => setMode(item.mode)}
              title={item.hint}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar-tools">
          {!mapMode ? (
            <div className="workspace-view-tools" aria-label="Workspace panels">
              <button
                type="button"
                className={pathOpen ? "is-active" : ""}
                aria-pressed={pathOpen}
                onClick={() => setPathOpen((current) => !current)}
              >
                Path
              </button>
              <button
                type="button"
                className={inspectorOpen ? "is-active" : ""}
                aria-pressed={inspectorOpen}
                onClick={() => setInspectorOpen((current) => !current)}
              >
                Inspect
              </button>
              <button
                type="button"
                className={historyOpen ? "is-active" : ""}
                aria-pressed={historyOpen}
                onClick={() => setHistoryOpen((current) => !current)}
              >
                History
              </button>
            </div>
          ) : null}
          <ProjectSwitcher projects={snapshot.projects} />
          <div className="topbar-status" title={snapshot.source === "local" ? "Local learner state" : "Demo snapshot"}>
            <span className={`status-light ${snapshot.source === "local" ? "is-local" : "is-demo"}`} />
            <span className="topbar-status__label">{snapshot.source === "local" ? "local" : "demo"}</span>
          </div>
        </div>
      </header>

      {mapMode ? (
        <main className={mapStyles.mapModePanel}>
          <header className={mapStyles.mapModeHeader}>
            <div>
              <span className="section-kicker">Learning path</span>
              <h1>{snapshot.activeArc || "Current learning route"}</h1>
              <p>{snapshot.mission}</p>
            </div>
            <div className={mapStyles.mapModeHeaderSide}>
              <div className={mapStyles.mapModeHeaderMeta}>
                <span>{snapshot.map.nodes.length} nodes</span>
                <span>{snapshot.map.edges.length} semantic edges</span>
                <span>{snapshot.map.frontier.length} frontier</span>
              </div>
              {snapshot.projectId ? (
                <MapProposalReview
                  projectId={snapshot.projectId}
                  projectStatus={snapshot.projectStatus}
                  maintenanceStatus={snapshot.maintenanceStatus}
                />
              ) : null}
            </div>
          </header>
          <LearningMap map={snapshot.map} expanded projectId={snapshot.projectId} />
          <div className={`map-legend ${mapStyles.fullLegend}`} aria-label="Mastery legend">
            <span>○ unknown</span>
            <span>◔ exposed</span>
            <span>◐ developing</span>
            <span>● stable</span>
            <span>◆ transferable</span>
            <small>Topology and accepted learner state remain separate authorities.</small>
          </div>
        </main>
      ) : (
        <div className={`workspace-grid ${pathOpen ? "has-path" : ""} ${inspectorOpen ? "has-inspector" : ""}`}>
          {pathOpen ? (
            <aside className="map-panel">
              <div className="panel-header">
                <div>
                  <span className="section-kicker">Learning path</span>
                  <strong>{snapshot.activeArc || "Current route"}</strong>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  title="Open full learning map"
                  aria-label="Open full learning map"
                  onClick={() => setMode("Map")}
                >
                  ↗
                </button>
              </div>
              <div className="mission-card">
                <span>Mission</span>
                <p>{snapshot.mission}</p>
              </div>
              {snapshot.projectId ? (
                <CompletionGate
                  projectId={snapshot.projectId}
                  projectStatus={snapshot.projectStatus}
                />
              ) : null}
              <LearningMap map={snapshot.map} />
              <div className="map-legend" aria-label="Mastery legend">
                <span>○ unknown</span>
                <span>◔ exposed</span>
                <span>◐ developing</span>
                <span>● stable</span>
                <span>◆ transferable</span>
              </div>
            </aside>
          ) : null}

          <LearningCanvas snapshot={snapshot} mode={mode} />

          {inspectorOpen ? <StatePanel snapshot={snapshot} /> : null}
        </div>
      )}

      {historyOpen ? <SessionTimeline sessions={snapshot.sessions} projectId={snapshot.projectId} /> : null}
    </div>
  );
}
