"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtifactInteraction, FrequencyTreeArtifact, WorkspaceSnapshot } from "@/lib/types";

type Mode = "Teach" | "Study" | "Map" | "Review";
type Representation = "artifact" | "structure" | "evidence" | "contrast" | "flow";

const representationLabels: Record<Representation, string> = {
  artifact: "Interactive",
  structure: "Structure",
  evidence: "Evidence",
  contrast: "Contrast",
  flow: "Flow",
};

function FrequencyTreeArtifactView({
  artifact,
  onInteractionChange,
}: {
  artifact: FrequencyTreeArtifact;
  onInteractionChange: (interaction: ArtifactInteraction) => void;
}) {
  const model = artifact.payload;
  const [prevalence, setPrevalence] = useState(model.prevalence);
  const [predictionId, setPredictionId] = useState<string>();
  const conditionCount = model.population * prevalence;
  const complementCount = model.population - conditionCount;
  const truePositiveCount = conditionCount * model.sensitivity;
  const falsePositiveCount = complementCount * model.falsePositiveRate;
  const positiveCount = truePositiveCount + falsePositiveCount;
  const posterior = positiveCount === 0 ? 0 : truePositiveCount / positiveCount;
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

  function commitPrediction(optionId: string) {
    setPredictionId(optionId);
    onInteractionChange({
      artifactId: artifact.id,
      predictionId: optionId,
      initialPrevalence: model.prevalence,
      finalPrevalence: prevalence,
    });
  }

  function changePrevalence(value: number) {
    setPrevalence(value);
    if (predictionId) {
      onInteractionChange({
        artifactId: artifact.id,
        predictionId,
        initialPrevalence: model.prevalence,
        finalPrevalence: value,
      });
    }
  }

  return (
    <div className="artifact" aria-label={artifact.title}>
      <header className="artifact__header">
        <div>
          <span className="section-kicker">Interactive learning artifact</span>
          <h3>{artifact.title}</h3>
        </div>
        <span className="artifact__type">frequency tree</span>
      </header>
      <p className="artifact__goal">{artifact.learningGoal}</p>

      <section className="artifact-prediction" aria-labelledby={`prediction-${artifact.id}`}>
        <span>Predict before reveal</span>
        <p id={`prediction-${artifact.id}`}>{artifact.prediction.prompt}</p>
        <div className="artifact-prediction__options">
          {artifact.prediction.options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={predictionId === option.id}
              className={predictionId === option.id ? "is-selected" : ""}
              onClick={() => commitPrediction(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {predictionId ? (
        <>
          <label className="artifact-control" htmlFor={`prevalence-${artifact.id}`}>
            <div>
              <span>Base rate / prevalence</span>
              <strong>{percent.format(prevalence)}</strong>
            </div>
            <input
              id={`prevalence-${artifact.id}`}
              type="range"
              min={model.prevalenceMin}
              max={model.prevalenceMax}
              step={model.prevalenceStep}
              value={prevalence}
              onChange={(event) => changePrevalence(Number(event.target.value))}
            />
          </label>

          <div className="artifact-population" aria-live="polite">
            <div className="artifact-population__root">
              <span>Reference population</span>
              <strong>{number.format(model.population)} {model.labels.population}</strong>
            </div>
            <div className="artifact-branches">
              <div>
                <span>{model.labels.condition}</span>
                <strong>{number.format(conditionCount)}</strong>
                <small>{percent.format(model.sensitivity)} sensitivity → {number.format(truePositiveCount)} {model.labels.positive}</small>
              </div>
              <div>
                <span>{model.labels.complement}</span>
                <strong>{number.format(complementCount)}</strong>
                <small>{percent.format(model.falsePositiveRate)} false-positive rate → {number.format(falsePositiveCount)} {model.labels.falsePositive}</small>
              </div>
            </div>
          </div>

          <div className="artifact-result">
            <div>
              <span>positive results</span>
              <strong>{number.format(truePositiveCount)} + {number.format(falsePositiveCount)}</strong>
            </div>
            <div className="artifact-result__posterior">
              <span>posterior after a positive result</span>
              <strong>{percent.format(posterior)}</strong>
            </div>
          </div>

          <div className="artifact-prompt">
            <span>Now infer</span>
            <p>{artifact.inferencePrompt}</p>
            <small>Evidence target: {artifact.successEvidence}</small>
          </div>
        </>
      ) : (
        <div className="artifact-locked">
          <strong>Commit a prediction to unlock the population.</strong>
          <span>Your choice is context for the tutor, not an automatic grade.</span>
        </div>
      )}
    </div>
  );
}

function StructureView({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className="structure-strip">
      {snapshot.map.nodes.slice(0, 5).map((node, index) => (
        <div className="structure-step" key={node.id}>
          <span className={`state-mark state-mark--${node.state}`}>{node.state === "transferable" ? "◆" : node.state === "stable" ? "●" : node.state === "developing" ? "◐" : node.state === "exposed" ? "◔" : "○"}</span>
          <span>{node.label}</span>
          {index < Math.min(snapshot.map.nodes.length, 5) - 1 ? <span className="structure-arrow">→</span> : null}
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
  const [representation, setRepresentation] = useState<Representation>(snapshot.artifact ? "artifact" : "structure");
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [submitted, setSubmitted] = useState(snapshot.decision?.hasLearnerResponse ?? false);
  const [submitError, setSubmitError] = useState<string>();
  const [assessmentError, setAssessmentError] = useState<string>();
  const [artifactInteraction, setArtifactInteraction] = useState<ArtifactInteraction>();
  const [missionTitle, setMissionTitle] = useState("");
  const [missionGoal, setMissionGoal] = useState("");
  const [missionContext, setMissionContext] = useState("");
  const [missionError, setMissionError] = useState<string>();
  const [isStartingMission, setIsStartingMission] = useState(false);
  const projectWritable = snapshot.projectStatus === undefined
    || snapshot.projectStatus === "active"
    || (
      snapshot.projectStatus === "archived"
      && snapshot.maintenanceStatus === "study_active"
    );
  useEffect(() => {
    setSubmitted(snapshot.decision?.hasLearnerResponse ?? false);
    setResponse("");
    setSubmitError(undefined);
    setAssessmentError(undefined);
    setIsAssessing(false);
    setArtifactInteraction(undefined);
  }, [snapshot.decision?.id, snapshot.decision?.hasLearnerResponse]);
  useEffect(() => {
    setRepresentation(snapshot.artifact ? "artifact" : "structure");
  }, [snapshot.artifact?.id]);
  const availableRepresentations = useMemo<Representation[]>(() => (
    snapshot.artifact
      ? ["artifact", "structure", "evidence", "contrast", "flow"]
      : ["structure", "evidence", "contrast", "flow"]
  ), [snapshot.artifact]);
  const modeCopy = useMemo(() => {
    if (mode === "Study") return "Retrieve first. Repair only what fails, then apply or transfer.";
    if (mode === "Map") return "Inspect the dependency hypothesis without turning the graph into a progress score.";
    if (mode === "Review") return "Choose a high-value retrieval target from current evidence and dependency relevance.";
    return "Grow the model through one reachable cognitive move, then verify what changed.";
  }, [mode]);
  let composerMessage = "Your response stays in the local learning workspace";
  if (!projectWritable) {
    composerMessage = "This Project is read-only in its current lifecycle state";
  } else if (isAssessing) {
    composerMessage = `Assessing with ${snapshot.agent.model || "the configured Provider"}…`;
  } else if (submitted && snapshot.agent.configured) {
    composerMessage = `Saved locally · ${snapshot.agent.model} is ready to assess`;
  } else if (submitted && snapshot.agent.error) {
    composerMessage = snapshot.agent.error;
  } else if (submitted) {
    composerMessage = "Saved locally · continue with an external Agent";
  } else if (snapshot.artifact && !artifactInteraction) {
    composerMessage = "Commit a prediction in the artifact before submitting";
  }

  async function assessPendingResponse(decisionId: string) {
    if (isAssessing || !snapshot.agent.configured) return;
    setIsAssessing(true);
    setAssessmentError(undefined);
    try {
      const result = await fetch("/api/learning/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisionId }),
      });
      const payload = await result.json() as { error?: string };
      if (!result.ok) throw new Error(payload.error || "Could not assess the saved response.");
      router.refresh();
    } catch (error) {
      setAssessmentError(error instanceof Error ? error.message : "Could not assess the saved response.");
    } finally {
      setIsAssessing(false);
    }
  }

  async function submitLearnerResponse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !snapshot.decision
      || !response.trim()
      || isSubmitting
      || submitted
      || !projectWritable
      || (snapshot.artifact && !artifactInteraction)
    ) return;
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const result = await fetch("/api/learning/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisionId: snapshot.decision.id, response, artifactInteraction }),
      });
      const payload = await result.json() as { error?: string };
      if (!result.ok) throw new Error(payload.error || "Could not save your response.");
      setSubmitted(true);
      setResponse("");
      if (snapshot.agent.configured) {
        await assessPendingResponse(snapshot.decision.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save your response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startMission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!missionGoal.trim() || isStartingMission || snapshot.hasMission) return;
    setIsStartingMission(true);
    setMissionError(undefined);
    try {
      const result = await fetch("/api/learning/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: missionTitle, goal: missionGoal, context: missionContext }),
      });
      const payload = await result.json() as { error?: string };
      if (!result.ok) throw new Error(payload.error || "Could not start the learning mission.");
      router.refresh();
    } catch (error) {
      setMissionError(error instanceof Error ? error.message : "Could not start the learning mission.");
    } finally {
      setIsStartingMission(false);
    }
  }

  return (
    <main className="learning-canvas-panel">
      {snapshot.sessionBrief ? (
        <section className="session-brief" aria-label="Session brief">
          <span>{snapshot.sessionBrief.label}</span>
          <div>
            <strong>{snapshot.sessionBrief.title}</strong>
            <p>{snapshot.sessionBrief.detail}</p>
          </div>
        </section>
      ) : null}
      <header className="canvas-header">
        <div>
          <div className="eyebrow-row">
            <span className="mode-chip">{mode}</span>
            <span className="source-chip">{snapshot.source === "local" ? "LOCAL STATE" : "DEMO SNAPSHOT"}</span>
            <span className={`provider-chip ${snapshot.agent.configured ? "is-ready" : ""}`}>
              {snapshot.agent.configured
                ? `AGENT · ${snapshot.agent.model}`
                : snapshot.agent.error
                  ? "AGENT CONFIG ERROR"
                  : "EXTERNAL AGENT"}
            </span>
          </div>
          <h1>{snapshot.hasMission ? snapshot.frontier : "What do you want to become able to do?"}</h1>
          <p>{snapshot.hasMission
            ? modeCopy
            : "Start with an observable capability. The learning map and first move should be built from your goal, not invented before you arrive."}</p>
        </div>
      </header>

      {!snapshot.hasMission ? (
        <form className="mission-start" onSubmit={startMission}>
          <div className="mission-start__intro">
            <span className="section-kicker">Start a learning mission</span>
            <h2>Describe the capability, not just the topic.</h2>
            <p>For example: “Read an empirical ML paper and challenge its causal claims,” not only “learn machine learning.”</p>
          </div>
          <label>
            <span>Project name <small>optional</small></span>
            <input
              value={missionTitle}
              onChange={(event) => setMissionTitle(event.target.value)}
              maxLength={200}
              placeholder="A short name for this learning line"
            />
          </label>
          <label>
            <span>I want to become able to</span>
            <textarea
              value={missionGoal}
              onChange={(event) => setMissionGoal(event.target.value)}
              maxLength={1200}
              rows={3}
              required
              placeholder="What should you be able to explain, build, derive, decide, or transfer?"
            />
          </label>
          <label>
            <span>Why now? <small>optional</small></span>
            <textarea
              value={missionContext}
              onChange={(event) => setMissionContext(event.target.value)}
              maxLength={2400}
              rows={2}
              placeholder="A project, deadline, curiosity, or practical constraint that should shape the route."
            />
          </label>
          <div className="mission-start__footer">
            <span aria-live="polite">{missionError || "Saved locally. No learner model or mastery claim is created yet."}</span>
            <button type="submit" disabled={!missionGoal.trim() || isStartingMission}>
              {isStartingMission ? "Starting…" : "Start learning mission"}
            </button>
          </div>
        </form>
      ) : (
      <section className="teacher-move" aria-labelledby="move-title">
        <div className="teacher-move__meta">
          <span>Next step</span>
          <span className="thin-rule" />
          <span>one useful thing at a time</span>
        </div>
        <h2 id="move-title">{snapshot.nextMove}</h2>
        <div className="learner-action">
          <span>Your move</span>
          <p>{snapshot.expectedLearnerAction}</p>
        </div>
        {null}
      </section>
      )}

      {snapshot.latestExchange?.status === "assessed" ? (
        <section className="feedback-card" aria-labelledby="feedback-title">
          <div className="feedback-card__header">
            <div>
              <span className="section-kicker">From your last response</span>
              <strong id="feedback-title">Feedback</strong>
            </div>
          </div>
          <p className="feedback-card__response">“{snapshot.latestExchange.response}”</p>
          <p className="feedback-card__message">{snapshot.latestExchange.feedback}</p>
          {snapshot.latestExchange.nextDecisionId === snapshot.decision?.id ? (
            <div className="feedback-card__meta"><span>Next step ready</span></div>
          ) : null}
        </section>
      ) : null}

      {!snapshot.hasMission ? (
        <div className="demo-preview-note">
          <span>Example workspace</span>
          <p>The representation below is a clearly labeled preview, not your learner state.</p>
        </div>
      ) : null}

      <section className="representation-card">
        <div className="representation-toolbar">
          <div>
            <span className="section-kicker">Representation</span>
            <strong>Use the view that exposes the relation</strong>
          </div>
          <div className="segmented-control" role="tablist" aria-label="Representation switcher">
            {availableRepresentations.map((key) => (
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
          {representation === "artifact" && snapshot.artifact ? (
            <FrequencyTreeArtifactView
              key={snapshot.artifact.id}
              artifact={snapshot.artifact}
              onInteractionChange={setArtifactInteraction}
            />
          ) : null}
          {representation === "structure" ? <StructureView snapshot={snapshot} /> : null}
          {representation === "evidence" ? <EvidenceView snapshot={snapshot} /> : null}
          {representation === "contrast" ? <ContrastView snapshot={snapshot} /> : null}
          {representation === "flow" ? <FlowView snapshot={snapshot} /> : null}
        </div>
        <footer className="representation-footer">
          <span>READ</span><span>·</span><span>PREDICT</span><span>·</span><span>RECONSTRUCT</span><span>·</span><span>TRANSLATE</span>
        </footer>
      </section>

      {snapshot.hasMission ? (
      <form className={`composer-shell ${submitted ? "is-submitted" : ""}`} onSubmit={submitLearnerResponse}>
        <label className="composer-prompt" htmlFor="learner-response">
          <span className="composer-mark">↳</span>
          <textarea
            id="learner-response"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            disabled={!snapshot.decision || submitted || isSubmitting || !projectWritable}
            maxLength={12000}
            rows={3}
            placeholder={submitted
              ? "Response saved. The tutor will use it as evidence for the next move."
              : !projectWritable
                ? "Resume this Project or start an archived maintenance review before adding evidence."
              : snapshot.decision
                ? "Write what you think. Partial reasoning is completely fine."
                : "Start a Teach or Study turn to respond here."}
          />
        </label>
        <div className="composer-status">
          <span aria-live="polite">
            {assessmentError || submitError || composerMessage}
          </span>
          <div className="composer-actions">
            {submitted && snapshot.latestExchange?.status !== "assessed" ? (
              <button
                className="composer-refresh"
                type="button"
                disabled={isAssessing}
                onClick={() => snapshot.agent.configured
                  ? assessPendingResponse(snapshot.latestExchange?.decisionId || snapshot.decision?.id || "")
                  : router.refresh()}
              >
                {isAssessing
                  ? "Assessing…"
                  : snapshot.agent.configured
                    ? `Assess with ${snapshot.agent.model}`
                    : "Check feedback"}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!snapshot.decision || !response.trim() || submitted || isSubmitting || isAssessing || !projectWritable || Boolean(snapshot.artifact && !artifactInteraction)}
            >
              {isSubmitting
                ? "Saving…"
                : submitted
                  ? "Response saved"
                  : snapshot.artifact && !artifactInteraction
                    ? "Predict first"
                    : "Send"}
            </button>
          </div>
        </div>
      </form>
      ) : null}
    </main>
  );
}
