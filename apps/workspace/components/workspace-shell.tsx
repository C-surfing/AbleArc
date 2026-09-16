"use client";

import { useState } from "react";
import type { WorkspaceSnapshot } from "@/lib/types";
import { LearningMap } from "./learning-map";
import { LearningCanvas } from "./learning-canvas";
import { StatePanel } from "./state-panel";
import { SessionTimeline } from "./session-timeline";
import { ProjectSwitcher } from "./project-switcher";
import { CompletionGate } from "./completion-gate";

type Mode = "Teach" | "Study" | "Map" | "Review";

const modes: { mode: Mode; hint: string }[] = [
  { mode: "Teach", hint: "grow the model" },
  { mode: "Study", hint: "retrieve and repair" },
  { mode: "Map", hint: "inspect dependencies" },
  { mode: "Review", hint: "revisit high-value edges" },
];

export function WorkspaceShell({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const [mode, setMode] = useState<Mode>("Teach");

  return (
    <div className="workspace-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">a4</div>
          <div>
            <strong>ai4learning</strong>
            <span>Visual Learning Workspace</span>
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
              {item.mode}
            </button>
          ))}
        </nav>

        <div className="topbar-tools">
          <ProjectSwitcher projects={snapshot.projects} />
          <div className="topbar-status">
            <span className={`status-light ${snapshot.source === "local" ? "is-local" : "is-demo"}`} />
            <span>{snapshot.source === "local" ? "local" : "demo"}</span>
          </div>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="map-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Learning map</span>
              <strong>{snapshot.activeArc || "Current route"}</strong>
            </div>
            <button className="icon-button" type="button" title="Full-screen map mode is planned">↗</button>
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

        <LearningCanvas snapshot={snapshot} mode={mode} />
        <StatePanel snapshot={snapshot} />
      </div>

      <SessionTimeline sessions={snapshot.sessions} />
    </div>
  );
}
