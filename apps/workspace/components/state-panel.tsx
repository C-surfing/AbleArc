import type { EvidenceLevel, MasteryState, WorkspaceSnapshot } from "@/lib/types";
import { MaterialReader } from "./material-reader";
import { StateProposalReview } from "./state-proposal-review";

const stateMeta: Record<MasteryState, { glyph: string; label: string }> = {
  unknown: { glyph: "○", label: "Unknown" },
  exposed: { glyph: "◔", label: "Exposed" },
  developing: { glyph: "◐", label: "Developing" },
  stable: { glyph: "●", label: "Stable" },
  transferable: { glyph: "◆", label: "Transferable" },
};

const levels: EvidenceLevel[] = ["recognition", "recall", "explanation", "application", "transfer"];

export function StatePanel({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const strongest = snapshot.evidence.reduce(
    (max, item) => Math.max(max, levels.indexOf(item.level)),
    -1,
  );
  const state = stateMeta[snapshot.frontierState];

  return (
    <aside className="state-panel">
      <section className="state-section state-section--frontier">
        <div className="section-heading">
          <span>Frontier</span>
          <span className={`state-pill state-pill--${snapshot.frontierState}`}>{state.glyph} {state.label}</span>
        </div>
        <h2>{snapshot.frontier}</h2>
        <p>{snapshot.frontierReason}</p>
      </section>

      {snapshot.decision ? (
        <section className="state-section">
          <div className="section-heading">
            <span>Decision trace</span>
            <small>{snapshot.decision.uncertainty} uncertainty</small>
          </div>
          <div className="decision-trace">
            <div><span>move</span><strong>{snapshot.decision.move.replaceAll("_", " ")}</strong></div>
            <div><span>grounding</span><strong>{snapshot.decision.evidenceCount} supporting evidence item(s)</strong></div>
            <p>{snapshot.decision.rationale}</p>
            <small>{snapshot.decision.representationKind} · {snapshot.decision.representationPurpose}</small>
          </div>
        </section>
      ) : null}

      <section className="state-section">
        <div className="section-heading"><span>Evidence ladder</span><small>strongest observed</small></div>
        <div className="mini-ladder">
          {levels.map((level, index) => (
            <div key={level} className={`mini-ladder__item ${index <= strongest ? "is-observed" : ""}`}>
              <span className="mini-ladder__dot" />
              <span>{level}</span>
            </div>
          ))}
        </div>
        {snapshot.evidence.slice(0, 2).map((item) => (
          <div className="evidence-note" key={`${item.task}-${item.level}`}>
            <strong>{item.task}</strong>
            <span>{item.level} · {item.independence}</span>
            <p>{item.implication}</p>
          </div>
        ))}
        {snapshot.evidence.length === 0 ? <p className="empty-copy">No decisive evidence yet.</p> : null}
      </section>

      {snapshot.source === "local" && snapshot.projectId ? (
        <StateProposalReview
          projectId={snapshot.projectId}
          projectStatus={snapshot.projectStatus}
          maintenanceStatus={snapshot.maintenanceStatus}
        />
      ) : null}

      {snapshot.latestStateDecision ? (
        <section className="state-section">
          <div className="section-heading">
            <span>Latest state decision</span>
            <small>revision {snapshot.runtimeRevision ?? 0}</small>
          </div>
          <div className={`state-decision state-decision--${snapshot.latestStateDecision.decision}`}>
            <div>
              <strong>{snapshot.latestStateDecision.concept}</strong>
              <span>{snapshot.latestStateDecision.before} → {snapshot.latestStateDecision.after}</span>
            </div>
            <p>{snapshot.latestStateDecision.reason}</p>
            <small>
              {snapshot.latestStateDecision.authority} · {snapshot.latestStateDecision.evidenceCount} supporting evidence item(s)
              {snapshot.latestStateDecision.policyOverridden ? " · policy override recorded" : ""}
            </small>
          </div>
        </section>
      ) : null}

      <MaterialReader materials={snapshot.materials} />

      <section className="state-section">
        <div className="section-heading"><span>Active misconception</span><small>{snapshot.misconceptions.length}</small></div>
        {snapshot.misconceptions.slice(0, 2).map((item) => (
          <article className="misconception-card" key={item.belief}>
            <div className="misconception-card__meta">
              <span>{item.status}</span>
              <span>{item.confidence} confidence</span>
            </div>
            <p>{item.belief}</p>
            {item.evidence ? <small>{item.evidence}</small> : null}
          </article>
        ))}
        {snapshot.misconceptions.length === 0 ? <p className="empty-copy">No active misconception currently recorded.</p> : null}
      </section>

      <section className="state-section">
        <div className="section-heading"><span>Review candidate</span><small>{snapshot.reviewCandidates.length}</small></div>
        {snapshot.reviewCandidates.slice(0, 2).map((item) => (
          <div className="review-row" key={item.concept}>
            <div>
              <strong>{item.concept}</strong>
              <span>{item.reason}</span>
            </div>
            <span className={`strength strength--${item.strength}`}>{item.strength}</span>
          </div>
        ))}
        {snapshot.reviewCandidates.length === 0 ? <p className="empty-copy">No review trigger has been recorded.</p> : null}
      </section>
    </aside>
  );
}
