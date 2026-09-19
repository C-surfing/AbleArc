"use client";

import Link from "next/link";
import { useState } from "react";
import type { PaperLearningPlan, PaperRequestedMode } from "@/lib/paper-learning";
import styles from "./paper-study-studio.module.css";

type CompletionProfileStatus = "configured" | "already_configured" | "custom_contract_preserved";

function PlanView({ plan }: { plan: PaperLearningPlan }) {
  return (
    <section className={styles.plan} aria-label="Paper learning plan">
      <header className={styles.planHeader}>
        <div>
          <span>Current paper plan</span>
          <h2>{plan.sourceTitle}</h2>
        </div>
        <small>{plan.studyMode === "follow_source" ? "Follow source" : "Understanding first"}</small>
      </header>

      <div className={styles.summaryGrid}>
        <article>
          <span>Research problem</span>
          <p>{plan.researchProblem}</p>
        </article>
        <article>
          <span>Why it matters</span>
          <p>{plan.importance}</p>
        </article>
      </div>

      <section className={styles.planSection}>
        <h3>Claims</h3>
        <div className={styles.stack}>
          {plan.claims.map((claim) => (
            <article key={claim.id}>
              <strong>{claim.statement}</strong>
              <p>{claim.sourceBasis}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.planSection}>
        <h3>Method / mechanism</h3>
        <article className={styles.methodCard}>
          <strong>{plan.method.summary}</strong>
          {plan.method.mechanismSteps.length ? (
            <ol>
              {plan.method.mechanismSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          ) : null}
        </article>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.planSection}>
          <h3>Evidence</h3>
          <div className={styles.stack}>
            {plan.evidence.length ? plan.evidence.map((item, index) => (
              <article key={`${item.claimIds.join("-")}-${index}`}>
                <strong>{item.result}</strong>
                <p>{item.interpretation}</p>
                <small>Limits · {item.limits}</small>
              </article>
            )) : <p className={styles.empty}>No explicit evidence block was exposed in the supplied text.</p>}
          </div>
        </section>

        <section className={styles.planSection}>
          <h3>Limitations</h3>
          <div className={styles.stack}>
            {plan.limitations.length ? plan.limitations.map((item) => (
              <article key={item}><p>{item}</p></article>
            )) : <p className={styles.empty}>No limitation was explicit in the supplied text.</p>}
          </div>
        </section>
      </div>

      <section className={styles.planSection}>
        <h3>Prerequisite hypotheses</h3>
        <div className={styles.stack}>
          {plan.prerequisites.length ? plan.prerequisites.map((item) => (
            <article key={item.id}>
              <div className={styles.inlineTitle}>
                <strong>{item.label}</strong>
                <small>{item.selfReportStatus.replaceAll("_", " ")} · {item.confidence} confidence</small>
              </div>
              <p>{item.whyNeeded}</p>
            </article>
          )) : <p className={styles.empty}>No prerequisite detour is foregrounded yet.</p>}
        </div>
      </section>

      {plan.onboardingQuestions.length ? (
        <section className={styles.planSection}>
          <h3>Questions that could change the route</h3>
          <div className={styles.stack}>
            {plan.onboardingQuestions.map((item) => (
              <article key={item.question}>
                <strong>{item.question}</strong>
                <p>{item.decisionValue}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.path}>
        <span>Initial path</span>
        <ol>
          {plan.initialPath.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <p>{item.purpose}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.firstMove}>
        <span>Start here · {plan.firstMove.kind}</span>
        <h3>{plan.firstMove.target}</h3>
        <p>{plan.firstMove.message}</p>
        {plan.firstMove.learnerAction ? <strong>{plan.firstMove.learnerAction}</strong> : null}
        <Link href="/focus">Continue in Focus →</Link>
      </section>
    </section>
  );
}

export function PaperStudyStudio({
  projectId,
  missionId,
  missionGoal,
  existingPlan,
  writable,
}: {
  projectId: string;
  missionId: string;
  missionGoal: string;
  existingPlan?: PaperLearningPlan;
  writable: boolean;
}) {
  const [sourceText, setSourceText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [mode, setMode] = useState<PaperRequestedMode>("auto");
  const [plan, setPlan] = useState<PaperLearningPlan | undefined>(existingPlan);
  const [completionProfile, setCompletionProfile] = useState<CompletionProfileStatus>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function buildPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const excerpt = sourceText.trim();
    if (!excerpt || busy || !writable) return;

    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/learning/paper-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          turn: {
            schemaVersion: "0.1",
            host: { id: "workspace" },
            message: `Use this source to help me achieve the current Mission: ${missionGoal}`,
            projectId,
            missionId,
            references: [{
              id: "paper-source",
              kind: "text",
              label: sourceLabel.trim() || "Pasted paper source",
              excerpt,
              mediaType: "text/plain",
            }],
            capabilities: [],
          },
        }),
      });
      const body = await response.json() as {
        plan?: PaperLearningPlan;
        completionProfile?: CompletionProfileStatus;
        requestedCapability?: string;
        error?: string;
      };
      if (!response.ok || !body.plan) {
        throw new Error(
          body.error
          || (body.requestedCapability ? `This source still needs host capability: ${body.requestedCapability}.` : "")
          || "Could not build the paper-learning plan.",
        );
      }
      setPlan(body.plan);
      setCompletionProfile(body.completionProfile);
      setSourceText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build the paper-learning plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.studio}>
      <section className={styles.sourcePanel}>
        <header>
          <div>
            <span>Source-grounded entry</span>
            <h2>Turn a paper into a learning route.</h2>
          </div>
          <small>{projectId} / {missionId}</small>
        </header>
        <p className={styles.intro}>
          Paste extracted paper text or a substantial section. AbleArc reconstructs the argument and persists only the structured plan.
          The pasted source itself is not stored by Paper Learning.
        </p>

        <form onSubmit={buildPlan}>
          <label>
            <span>Source label <small>optional</small></span>
            <input
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
              maxLength={240}
              placeholder="Attention Is All You Need · full text"
              disabled={!writable || busy}
            />
          </label>

          <label>
            <span>Study order</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as PaperRequestedMode)}
              disabled={!writable || busy}
            >
              <option value="auto">Auto — infer from my Mission</option>
              <option value="understanding_first">Understanding first — reorder by dependency</option>
              <option value="follow_source">Follow source — broadly preserve paper order</option>
            </select>
          </label>

          <label>
            <span>Paper / section text</span>
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              rows={16}
              maxLength={80000}
              placeholder="Paste the extracted text here. For long papers, a meaningful section is enough to start; you can regenerate the plan when you add more source context."
              disabled={!writable || busy}
              required
            />
          </label>

          <div className={styles.actions}>
            <button type="submit" disabled={!writable || busy || !sourceText.trim()}>
              {busy ? "Building grounded plan…" : plan ? "Rebuild from this source" : "Build paper plan"}
            </button>
            <span>{sourceText.length.toLocaleString()} / 80,000 characters</span>
          </div>
          {!writable ? (
            <p className={styles.warning}>This Project is read-only. Resume it before replacing the paper plan.</p>
          ) : null}
          {completionProfile ? (
            <p className={styles.status}>
              Completion profile · {completionProfile.replaceAll("_", " ")}
            </p>
          ) : null}
          {error ? <p className={styles.warning} role="alert">{error}</p> : null}
        </form>
      </section>

      {plan ? <PlanView plan={plan} /> : (
        <aside className={styles.emptyState}>
          <span>No paper plan yet</span>
          <strong>The first useful output is not a summary.</strong>
          <p>
            It will reconstruct problem → claims → method → evidence → limitations, infer bounded prerequisite hypotheses,
            and produce the first teaching move without marking anything mastered.
          </p>
        </aside>
      )}
    </div>
  );
}
