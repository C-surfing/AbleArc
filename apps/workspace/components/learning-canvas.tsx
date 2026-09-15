"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [representation, setRepresentation] = useState<Representation>("structure");
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(snapshot.decision?.hasLearnerResponse ?? false);
  const [submitError, setSubmitError] = useState<string>();
  useEffect(() => {
    setSubmitted(snapshot.decision?.hasLearnerResponse ?? false);
    setResponse("");
    setSubmitError(undefined);
  }, [snapshot.decision?.id, snapshot.decision?.hasLearnerResponse]);
  const modeCopy = useMemo(() => {
    if (mode === "Study") return "Retrieve first. Repair only what fails, then apply or transfer.";
    if (mode === "Map") return "Inspect the dependency hypothesis without turning the graph into a progress score.";
    if (mode === "Review") return "Choose a high-value retrieval target from current evidence and dependency relevance.";
    return "Grow the model through one reachable cognitive move, then verify what changed.";
  }, [mode]);

  async function submitLearnerResponse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot.decision || !response.trim() || isSubmitting || submitted) return;
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const result = await fetch("/api/learning/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisionId: snapshot.decision.id, response }),
      });
      const payload = await result.json() as { error?: string };
      if (!result.ok) throw new Error(payload.error || "Could not save your response.");
      setSubmitted(true);
      setResponse("");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save your response.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

      {snapshot.latestExchange?.status === "assessed" ? (
        <section className="feedback-card" aria-labelledby="feedback-title">
          <div className="feedback-card__header">
            <div>
              <span className="section-kicker">Feedback from your last move</span>
              <strong id="feedback-title">What changed in the learner model</strong>
            </div>
            <span className={`feedback-outcome feedback-outcome--${snapshot.latestExchange.outcome}`}>
              {snapshot.latestExchange.outcome}
            </span>
          </div>
          <p className="feedback-card__response">“{snapshot.latestExchange.response}”</p>
          <p className="feedback-card__message">{snapshot.latestExchange.feedback}</p>
          <div className="feedback-card__meta">
            <span>{snapshot.latestExchange.level} evidence</span>
            <span>{snapshot.latestExchange.confidence} confidence</span>
            {snapshot.latestExchange.nextDecisionId === snapshot.decision?.id ? <span>next move ready</span> : null}
          </div>
          {snapshot.latestExchange.supports.length > 0 || snapshot.latestExchange.contradicts.length > 0 ? (
            <div className="feedback-card__implications">
              {snapshot.latestExchange.supports.length > 0 ? (
                <p><strong>Supports</strong> {snapshot.latestExchange.supports.join(" · ")}</p>
              ) : null}
              {snapshot.latestExchange.contradicts.length > 0 ? (
                <p><strong>Still challenges</strong> {snapshot.latestExchange.contradicts.join(" · ")}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

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

      <form className={`composer-shell ${submitted ? "is-submitted" : ""}`} onSubmit={submitLearnerResponse}>
        <label className="composer-prompt" htmlFor="learner-response">
          <span className="composer-mark">↳</span>
          <textarea
            id="learner-response"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            disabled={!snapshot.decision || submitted || isSubmitting}
            maxLength={12000}
            rows={3}
            placeholder={submitted
              ? "Response saved. The tutor will use it as evidence for the next move."
              : snapshot.decision
                ? "Write what you think. Partial reasoning is useful evidence."
                : "Start a Teach or Study turn to respond here."}
          />
        </label>
        <div className="composer-status">
          <span aria-live="polite">
            {submitError
              || (submitted
                ? "Saved locally · awaiting assessment"
                : "Your response stays in the local learning workspace")}
          </span>
          <div className="composer-actions">
            {submitted && snapshot.latestExchange?.status !== "assessed" ? (
              <button className="composer-refresh" type="button" onClick={() => router.refresh()}>
                Check feedback
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!snapshot.decision || !response.trim() || submitted || isSubmitting}
            >
              {isSubmitting ? "Saving…" : submitted ? "Response saved" : "Submit thinking"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
