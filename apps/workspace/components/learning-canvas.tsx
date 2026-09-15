"use client";

import { useMemo, useState } from "react";
import type { WorkspaceSnapshot } from "@/lib/types";

type Mode = "Teach" | "Study" | "Map" | "Review";
type Representation = "structure" | "evidence" | "contrast" | "flow";

const representationLabels: Record<Representation, string> = {
  structure: "Structure",
  evidence: "Evidence",
  contrast: "Contrast",
  flow: "Flow",
};

function BayesFrequencyTree() {
  return (
    <div className="frequency-tree" aria-label="Bayes frequency tree example">
      <div className="frequency-tree__root">10,000 people</div>
      <div className="frequency-tree__branches">
        <div>
          <span className="tree-label">Disease · 100</span>
          <span className="tree-result">Positive · 99</span>
        </div>
        <div>
          <span className="tree-label">No disease · 9,900</span>
          <span className="tree-result">False positive · 495</span>
        </div>
      </div>
      <div className="frequency-tree__inference">
        posterior = 99 / (99 + 495) ≈ <strong>16.7%</strong>
      </div>
    </div>
  );
}

function StructureView({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  if (snapshot.source === "demo") return <BayesFrequencyTree />;
  return (
    <div className="structure-strip">
      {snapshot.nodes.slice(0, 5).map((node, index) => (
        <div className="structure-step" key={node.id}>
          <span className={`state-mark state-mark--${node.state}`}>{node.state === "transferable" ? "◆" : node.state === "stable" ? "●" : node.state === "developing" ? "◐" : node.state === "exposed" ? "◔" : "○"}</span>
          <span>{node.label}</span>
          {index < Math.min(snapshot.nodes.length, 5) - 1 ? <span className="structure-arrow">→</span> : null}
        </div>
      ))}
    </div>
  );
}

function EvidenceView({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const levels = ["recognition", "recall", "explanation", "application", "transfer"];
  const strongest = snapshot.evidence.reduce((max, item) => Math.max(max, levels.indexOf(item.level)), -1);
  return (
    <div className="evidence-canvas">
      <div className="evidence-ladder evidence-ladder--large">
        {levels.map((level, index) => (
          <div key={level} className={`evidence-rung ${index <= strongest ? "is-observed" : ""}`}>
            <span>{index + 1}</span>
            <strong>{level}</strong>
            <small>{index <= strongest ? "supported" : "not yet verified"}</small>
          </div>
        ))}
      </div>
      {snapshot.evidence.length === 0 ? <p className="empty-copy">No decisive evidence has been recorded yet.</p> : null}
    </div>
  );
}

function ContrastView({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className="contrast-grid">
      <div className="contrast-card">
        <span>Current friction</span>
        <strong>{snapshot.frontierReason}</strong>
      </div>
      <div className="contrast-divider">→</div>
      <div className="contrast-card contrast-card--target">
        <span>Next independent action</span>
        <strong>{snapshot.expectedLearnerAction}</strong>
      </div>
    </div>
  );
}

function FlowView({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const steps = [
    ["MODEL", snapshot.frontier],
    ["MOVE", snapshot.nextMove],
    ["LEARNER ACTS", snapshot.expectedLearnerAction],
    ["EVIDENCE", "Confirm, preserve, or revise the learner model"],
  ];
  return (
    <div className="cognitive-flow">
      {steps.map(([label, value], index) => (
        <div className="cognitive-flow__row" key={label}>
          <div className="cognitive-flow__label">{label}</div>
          <div className="cognitive-flow__value">{value}</div>
          {index < steps.length - 1 ? <div className="cognitive-flow__line" /> : null}
        </div>
      ))}
    </div>
  );
}

export function LearningCanvas({ snapshot, mode }: { snapshot: WorkspaceSnapshot; mode: Mode }) {
  const [representation, setRepresentation] = useState<Representation>("structure");
  const modeCopy = useMemo(() => {
    if (mode === "Study") return "Retrieve first. Repair only what fails, then apply or transfer.";
    if (mode === "Map") return "Inspect the dependency hypothesis without turning the graph into a progress score.";
    if (mode === "Review") return "Choose a high-value retrieval target from current evidence and dependency relevance.";
    return "Grow the model through one reachable cognitive move, then verify what changed.";
  }, [mode]);

  return (
    <main className="learning-canvas-panel">
      <header className="canvas-header">
        <div>
          <div className="eyebrow-row">
            <span className="mode-chip">{mode}</span>
            <span className="source-chip">{snapshot.source === "local" ? "LOCAL STATE" : "DEMO SNAPSHOT"}</span>
          </div>
          <h1>{snapshot.frontier}</h1>
          <p>{modeCopy}</p>
        </div>
        <button className="ghost-button" type="button" title="Source drawer is part of the next interaction slice">
          Sources
        </button>
      </header>

      <section className="teacher-move" aria-labelledby="move-title">
        <div className="teacher-move__meta">
          <span>Current move</span>
          <span className="thin-rule" />
          <span>capability delta, not content volume</span>
        </div>
        <h2 id="move-title">{snapshot.nextMove}</h2>
        <div className="learner-action">
          <span>Your move</span>
          <p>{snapshot.expectedLearnerAction}</p>
        </div>
        {snapshot.decision ? (
          <div className="decision-expectation">
            <div><span>Expected evidence</span><p>{snapshot.decision.expectedEvidence}</p></div>
            <div><span>Would falsify</span><p>{snapshot.decision.falsificationSignal}</p></div>
          </div>
        ) : null}
      </section>

      <section className="representation-card">
        <div className="representation-toolbar">
          <div>
            <span className="section-kicker">Representation</span>
            <strong>Use the view that exposes the relation</strong>
          </div>
          <div className="segmented-control" role="tablist" aria-label="Representation switcher">
            {(Object.keys(representationLabels) as Representation[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={representation === key}
                className={representation === key ? "is-active" : ""}
                onClick={() => setRepresentation(key)}
              >
                {representationLabels[key]}
              </button>
            ))}
          </div>
        </div>
        <div className="representation-stage">
          {representation === "structure" ? <StructureView snapshot={snapshot} /> : null}
          {representation === "evidence" ? <EvidenceView snapshot={snapshot} /> : null}
          {representation === "contrast" ? <ContrastView snapshot={snapshot} /> : null}
          {representation === "flow" ? <FlowView snapshot={snapshot} /> : null}
        </div>
        <footer className="representation-footer">
          <span>READ</span><span>·</span><span>PREDICT</span><span>·</span><span>RECONSTRUCT</span><span>·</span><span>TRANSLATE</span>
        </footer>
      </section>

      <section className="composer-shell" aria-label="Agent bridge placeholder">
        <div className="composer-prompt">
          <span className="composer-mark">↳</span>
          <span>Respond, derive, sketch, or ask why…</span>
        </div>
        <div className="composer-status">
          <span>Agent bridge is intentionally not wired in this read-first slice.</span>
          <span className="kbd">⌘ ↵</span>
        </div>
      </section>
    </main>
  );
}
