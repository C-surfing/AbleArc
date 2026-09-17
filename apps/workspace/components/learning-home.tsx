"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { WorkspaceSnapshot } from "@/lib/types";
import { deriveTodayRecommendation, entryProjectTitle } from "@/lib/today";
import { ProjectSwitcher } from "./project-switcher";
import styles from "./learning-home.module.css";

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark}>AA</span>
      <span>
        <strong>AbleArc</strong>
        <small>Learning OS</small>
      </span>
    </div>
  );
}

export function LearningHome({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  if (!snapshot.hasMission || !snapshot.projectId) {
    return <Entry />;
  }
  return <Today snapshot={snapshot} />;
}

function Entry() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function begin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const capability = goal.trim();
    if (!capability || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title.trim() || entryProjectTitle(capability),
          goal: capability,
          why: "",
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not create the learning Project.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the learning Project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.entryPage}>
      <header className={styles.entryHeader}>
        <Brand />
        <Link className={styles.quietLink} href="/workspace">Open Workspace</Link>
      </header>

      <main className={styles.entryMain}>
        <section className={styles.entryPrompt}>
          <span className={styles.kicker}>Start one learning arc</span>
          <h1>What do you want to learn or become able to do?</h1>
          <p>
            Describe an observable capability. AbleArc will keep the learning state local,
            open with a representative attempt, and build the map from evidence rather than assumptions.
          </p>

          <form className={styles.entryForm} onSubmit={begin}>
            <label className={styles.primaryField}>
              <span>Capability goal</span>
              <textarea
                autoFocus
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                rows={5}
                maxLength={1200}
                placeholder="For example: derive and implement backpropagation for a small MLP without relying on a memorized formula."
                required
              />
            </label>

            <details className={styles.optionalDetails}>
              <summary>Optional: name this Project</summary>
              <label>
                <span>Project name</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  placeholder="Backpropagation from first principles"
                />
              </label>
            </details>

            <div className={styles.entryActions}>
              <button className={styles.primaryButton} type="submit" disabled={busy || !goal.trim()}>
                {busy ? "Creating…" : "Begin learning"}
              </button>
              <span>One goal first. No dashboard setup required.</span>
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </form>
        </section>

        <aside className={styles.entryPrinciples} aria-label="AbleArc learning principles">
          <div>
            <span>01</span>
            <strong>One cognitive move at a time</strong>
            <p>The product foregrounds what you should do, not every internal subsystem.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Evidence before confidence</strong>
            <p>Time spent, clicks, and model praise do not become mastery evidence.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Runtime remains authoritative</strong>
            <p>The Web experience can guide learning without inventing learner truth.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Today({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const recommendation = useMemo(() => deriveTodayRecommendation(snapshot), [snapshot]);
  const [availableMinutes, setAvailableMinutes] = useState("");
  const evidenceLabel = snapshot.evidence.length === 1
    ? "1 accepted evidence item"
    : `${snapshot.evidence.length} accepted evidence items`;

  return (
    <div className={styles.todayPage}>
      <header className={styles.todayHeader}>
        <Brand />
        <nav className={styles.productNav} aria-label="AbleArc product navigation">
          <span className={styles.activeNav}>Today</span>
          <Link href="/workspace">Workspace</Link>
        </nav>
        <div className={styles.headerTools}>
          <ProjectSwitcher projects={snapshot.projects} />
          <span className={styles.sourceBadge}>{snapshot.source === "local" ? "local" : "demo"}</span>
        </div>
      </header>

      <main className={styles.todayMain}>
        <section className={styles.todayIntro}>
          <div>
            <span className={styles.kicker}>Today · {snapshot.projectTitle || "Current Project"}</span>
            <h1>One useful move, then reassess.</h1>
            <p>{snapshot.mission}</p>
          </div>
          <label className={styles.timeInput}>
            <span>Available time <small>optional</small></span>
            <span className={styles.timeControl}>
              <input
                inputMode="numeric"
                min={1}
                max={480}
                type="number"
                value={availableMinutes}
                onChange={(event) => setAvailableMinutes(event.target.value)}
                placeholder="30"
              />
              <span>min</span>
            </span>
            <small>Phase 1 keeps this local to the page; it does not change learner state.</small>
          </label>
        </section>

        <section className={styles.primaryMove}>
          <span className={styles.moveEyebrow}>{recommendation.eyebrow}</span>
          <h2>{recommendation.action}</h2>
          <p>{recommendation.rationale}</p>
          <div className={styles.moveActions}>
            <Link className={styles.primaryButton} href="/workspace">{recommendation.cta}</Link>
            <Link className={styles.secondaryButton} href="/workspace">Inspect map and evidence</Link>
          </div>
        </section>

        <section className={styles.contextGrid} aria-label="Current learning context">
          <article>
            <span className={styles.cardLabel}>Mission</span>
            <strong>{snapshot.projectTitle || "Current Project"}</strong>
            <p>{snapshot.mission}</p>
          </article>
          <article>
            <span className={styles.cardLabel}>Frontier</span>
            <strong>{snapshot.frontier}</strong>
            <p>{snapshot.frontierReason}</p>
            <footer>
              <span className={styles.statePill}>{snapshot.frontierState}</span>
              <span>{evidenceLabel}</span>
            </footer>
          </article>
        </section>

        <footer className={styles.todayFooter}>
          <span>Today is a recommendation surface, not a mastery authority.</span>
          <Link href="/workspace">Open full Workspace →</Link>
        </footer>
      </main>
    </div>
  );
}
