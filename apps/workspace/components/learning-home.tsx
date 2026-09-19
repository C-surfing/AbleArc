"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ContextScale, DailyContext } from "@/lib/daily-context";
import { deriveDailyRecommendation } from "@/lib/daily-recommendation";
import { deriveLearnerMapSummary } from "@/lib/learner-map-review";
import type { TomorrowSeed } from "@/lib/session-close";
import type { WorkspaceSnapshot } from "@/lib/types";
import { entryProjectTitle } from "@/lib/today";
import { ProjectSwitcher } from "./project-switcher";
import { ReviewSuggestions } from "./review-suggestions";
import contextStyles from "./daily-context.module.css";
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

export function LearningHome({
  snapshot,
  dailyContext,
  tomorrowSeed,
}: {
  snapshot: WorkspaceSnapshot;
  dailyContext?: DailyContext;
  tomorrowSeed?: TomorrowSeed;
}) {
  if (!snapshot.hasMission || !snapshot.projectId) {
    return <Entry />;
  }
  return <Today snapshot={snapshot} initialContext={dailyContext} tomorrowSeed={tomorrowSeed} />;
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

function Today({
  snapshot,
  initialContext,
  tomorrowSeed,
}: {
  snapshot: WorkspaceSnapshot;
  initialContext?: DailyContext;
  tomorrowSeed?: TomorrowSeed;
}) {
  const [context, setContext] = useState<DailyContext | undefined>(initialContext);
  const [energy, setEnergy] = useState<ContextScale | undefined>(initialContext?.energy);
  const [availableMinutes, setAvailableMinutes] = useState(
    initialContext?.availableMinutes ? String(initialContext.availableMinutes) : "",
  );
  const [focus, setFocus] = useState<ContextScale | undefined>(initialContext?.focus);
  const [note, setNote] = useState(initialContext?.note || "");
  const [savingContext, setSavingContext] = useState(false);
  const [contextError, setContextError] = useState<string>();
  const recommendation = useMemo(
    () => deriveDailyRecommendation(snapshot, context, tomorrowSeed),
    [snapshot, context, tomorrowSeed],
  );
  const primaryHref = recommendation.primary.kind === "read-only" || !snapshot.decision
    ? "/workspace"
    : "/focus";
  const evidenceLabel = snapshot.evidence.length === 1
    ? "1 accepted evidence item"
    : `${snapshot.evidence.length} accepted evidence items`;
  const learnerMap = useMemo(() => deriveLearnerMapSummary(snapshot.map), [snapshot.map]);

  async function saveContext() {
    if (!energy || savingContext) return;
    setSavingContext(true);
    setContextError(undefined);
    try {
      const response = await fetch("/api/daily-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: context?.revision ?? 0,
          energy,
          ...(availableMinutes ? { availableMinutes: Number(availableMinutes) } : {}),
          ...(focus ? { focus } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const body = await response.json() as { context?: DailyContext; error?: string };
      if (!response.ok || !body.context) {
        throw new Error(body.error || "Could not save DailyContext.");
      }
      setContext(body.context);
    } catch (caught) {
      setContextError(caught instanceof Error ? caught.message : "Could not save DailyContext.");
    } finally {
      setSavingContext(false);
    }
  }

  return (
    <div className={styles.todayPage}>
      <header className={styles.todayHeader}>
        <Brand />
        <nav className={styles.productNav} aria-label="AbleArc product navigation">
          <span className={styles.activeNav}>Today</span>
          <Link href="/paper">Paper</Link>
          <Link href="/reflection">Reflection</Link>
          <Link href="/profile">Profile</Link>
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

          <aside className={contextStyles.dailyContext} aria-label="Daily learning context">
            <div className={contextStyles.contextHeader}>
              <div>
                <span>Daily context</span>
                <strong>Shape the session</strong>
              </div>
              {context ? <small>rev {context.revision}</small> : <small>optional</small>}
            </div>

            <fieldset className={contextStyles.scaleField}>
              <legend>Energy</legend>
              <div className={contextStyles.scaleButtons}>
                {([1, 2, 3, 4, 5] as ContextScale[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={energy === value}
                    className={energy === value ? contextStyles.isSelected : ""}
                    onClick={() => setEnergy(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={contextStyles.contextFields}>
              <label>
                <span>Minutes <small>optional</small></span>
                <input
                  inputMode="numeric"
                  min={1}
                  max={720}
                  type="number"
                  value={availableMinutes}
                  onChange={(event) => setAvailableMinutes(event.target.value)}
                  placeholder="30"
                />
              </label>
              <label>
                <span>Focus <small>optional</small></span>
                <select
                  value={focus || ""}
                  onChange={(event) => setFocus(
                    event.target.value ? Number(event.target.value) as ContextScale : undefined,
                  )}
                >
                  <option value="">—</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
            </div>

            <details className={contextStyles.contextNote}>
              <summary>Optional note</summary>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Anything that should shape this session, not your mastery."
              />
            </details>

            <button
              className={contextStyles.contextSave}
              type="button"
              disabled={!energy || savingContext}
              onClick={saveContext}
            >
              {savingContext ? "Saving…" : context ? "Update context" : "Use this context"}
            </button>
            <small className={contextStyles.contextBoundary}>
              Context can alter recommendation strategy. It cannot change mastery.
            </small>
            {contextError ? <p className={styles.error} role="alert">{contextError}</p> : null}
          </aside>
        </section>

        <section className={styles.primaryMove}>
          <span className={styles.moveEyebrow}>{recommendation.primary.eyebrow}</span>
          <h2>{recommendation.primary.action}</h2>
          <p>{recommendation.primary.rationale}</p>
          <div className={contextStyles.sessionShape}>
            <span>Session shape · {recommendation.moveType.replaceAll("-", " ")}</span>
            <p>{recommendation.sessionShape}</p>
            {recommendation.contextRationale ? (
              <details>
                <summary>Why did context change this shape?</summary>
                <p>{recommendation.contextRationale}</p>
              </details>
            ) : null}
          </div>
          <div className={styles.moveActions}>
            <Link className={styles.primaryButton} href={primaryHref}>{recommendation.primary.cta}</Link>
            <Link className={styles.secondaryButton} href="/workspace">Inspect map and evidence</Link>
          </div>
        </section>

        <section className={styles.mapSummary} aria-label="Learning map summary">
          <header>
            <div>
              <span className={styles.cardLabel}>Your learning map</span>
              <h2>Where you are and what it opens next.</h2>
            </div>
            <Link href="/workspace">Open full map →</Link>
          </header>
          <div className={styles.mapSummaryGrid}>
            <article>
              <span>Current frontier</span>
              <strong>{learnerMap.frontier.join(", ") || snapshot.frontier}</strong>
              <p>{snapshot.frontierReason}</p>
            </article>
            <article>
              <span>Already holding</span>
              <strong>{learnerMap.stable.length || 0}</strong>
              <p>{learnerMap.stable.slice(0, 4).join(" · ") || "No knowledge is marked stable yet."}</p>
            </article>
            <article>
              <span>Still forming</span>
              <strong>{learnerMap.developing.length || 0}</strong>
              <p>{learnerMap.developing.slice(0, 4).join(" · ") || "No developing nodes are currently visible."}</p>
            </article>
            <article>
              <span>{learnerMap.blockers.length ? "Prerequisite blocker" : "Plausible next direction"}</span>
              <strong>{learnerMap.blockers[0] || learnerMap.nextDirections[0] || "Keep working the frontier"}</strong>
              <p>{learnerMap.blockers.length
                ? "This prerequisite is not yet solid enough for the current frontier."
                : learnerMap.nextDirections.length
                  ? "This becomes more reachable as the current frontier strengthens."
                  : "The map does not need to invent a next branch yet."}</p>
            </article>
          </div>
        </section>

        <ReviewSuggestions snapshot={snapshot} />

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
          <span>
            Recommendation authority: Evidence ✕ · mastery ✕ · Map ✕ · Completion ✕
          </span>
          <Link href="/workspace">Open full Workspace →</Link>
        </footer>
      </main>
    </div>
  );
}
