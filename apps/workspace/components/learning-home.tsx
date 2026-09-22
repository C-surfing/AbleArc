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
      <span className={styles.brandMark}>A</span>
      <span>
        <strong>AbleArc</strong>
        <small>learn deliberately</small>
      </span>
    </div>
  );
}

function EntryField() {
  return (
    <aside className={styles.entryField} aria-hidden="true">
      <div className={styles.entryFieldOrbit}>
        <span />
        <span />
        <span />
      </div>
      <span className={styles.fieldIndex}>A / 01</span>
      <strong>Build an arc<br />through what<br />you do not know.</strong>
      <div className={styles.fieldLegend}>
        <span>observe</span>
        <span>explain</span>
        <span>apply</span>
        <span>transfer</span>
      </div>
    </aside>
  );
}

function ProjectField({ title, frontier }: { title: string; frontier: string }) {
  return (
    <div className={styles.projectField} aria-hidden="true">
      <span className={styles.fieldIndex}>ACTIVE ARC</span>
      <div className={styles.projectOrbit}>
        <span />
        <span />
        <span />
      </div>
      <strong>{title}</strong>
      <p>{frontier}</p>
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
    return <Entry projects={snapshot.projects} />;
  }
  return <Today snapshot={snapshot} initialContext={dailyContext} tomorrowSeed={tomorrowSeed} />;
}

function Entry({ projects }: { projects: WorkspaceSnapshot["projects"] }) {
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
        <div className={styles.entryHeaderLinks}>
          <ProjectSwitcher projects={projects} />
          <Link className={styles.quietLink} href="/settings">Settings</Link>
          <Link className={styles.quietLink} href="/workspace">Inspect</Link>
        </div>
      </header>

      <main className={styles.entryMain}>
        <section className={styles.entryPrompt}>
          <span className={styles.kicker}>Begin with curiosity</span>
          <h1>What’s worth<br /><em>understanding?</em></h1>
          <p>
            Start with one question, mechanism, or capability. AbleArc turns it into a learning arc
            and adapts from what you actually demonstrate.
          </p>

          <form className={styles.entryForm} onSubmit={begin}>
            <label className={styles.primaryField}>
              <span>What are you trying to understand or become able to do?</span>
              <textarea
                autoFocus
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                rows={5}
                maxLength={1200}
                placeholder="For example: Why is CUDA shared memory actually fast, and when should I use it?"
                required
              />
            </label>

            <details className={styles.optionalDetails}>
              <summary>Optional · name this learning arc</summary>
              <label>
                <span>Project name</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  placeholder="CUDA memory hierarchy"
                />
              </label>
            </details>

            <div className={styles.entryActions}>
              <button className={styles.primaryButton} type="submit" disabled={busy || !goal.trim()}>
                {busy ? "Creating…" : "Start exploring"}
              </button>
              <span>One useful question first. Refine the goal as you learn.</span>
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </form>
        </section>

        <EntryField />
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
          <Link href="/workspace">Inspect</Link>
        </nav>
        <div className={styles.headerTools}>
          <ProjectSwitcher projects={snapshot.projects} />
          <Link className={styles.quietLink} href="/profile">Profile</Link>
          <Link className={styles.quietLink} href="/settings">Settings</Link>
        </div>
      </header>

      <main className={styles.todayMain}>
        <section className={styles.todayHero}>
          <div className={styles.todayIdentity}>
            <span className={styles.kicker}>Current project</span>
            <h1>{snapshot.projectTitle || "Continue learning"}</h1>
            <p>{snapshot.mission}</p>
            <ProjectField
              title={snapshot.projectTitle || "Current project"}
              frontier={snapshot.frontier}
            />
          </div>

          <section className={styles.primaryMove}>
            <span className={styles.moveEyebrow}>{recommendation.primary.eyebrow}</span>
            <h2>{recommendation.primary.action}</h2>
            <p>{recommendation.primary.rationale}</p>
            <details className={contextStyles.sessionShapeDisclosure}>
              <summary>Session plan · {recommendation.moveType.replaceAll("-", " ")}</summary>
              <div className={contextStyles.sessionShape}>
                <p>{recommendation.sessionShape}</p>
                {recommendation.contextRationale ? (
                  <details>
                    <summary>Why did context change this plan?</summary>
                    <p>{recommendation.contextRationale}</p>
                  </details>
                ) : null}
              </div>
            </details>
            <div className={styles.moveActions}>
              <Link className={styles.primaryButton} href={primaryHref}>{recommendation.primary.cta}</Link>
              <Link className={styles.secondaryButton} href="/workspace">Inspect the arc</Link>
            </div>
          </section>
        </section>

        <details className={`${contextStyles.dailyContextDisclosure} ${styles.contextDisclosure}`}>
            <summary>
              <span>
                <small>Session context</small>
                <strong>Shape today’s session</strong>
              </span>
              <span>{context ? `Energy ${context.energy} · ${context.availableMinutes || "—"} min` : "Optional"}</span>
            </summary>
            <aside className={contextStyles.dailyContext} aria-label="Daily learning context">
              <div className={contextStyles.contextHeader}>
                <div>
                  <span>Daily context</span>
                  <strong>Only change how we approach this session</strong>
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
        </details>

        <section className={styles.mapSummary} aria-label="Learning map summary">
          <header>
            <div>
              <span className={styles.cardLabel}>Your arc</span>
              <h2>What is stable, what is forming, what opens next.</h2>
            </div>
            <Link href="/workspace">Open map →</Link>
          </header>
          <div className={styles.mapSummaryGrid}>
            <article>
              <span>Current frontier</span>
              <strong>{learnerMap.frontier.join(", ") || snapshot.frontier}</strong>
            </article>
            <article>
              <span>Learning state</span>
              <strong>{learnerMap.stable.length || 0} stable · {learnerMap.developing.length || 0} forming</strong>
              <p>{learnerMap.developing.slice(0, 3).join(" · ") || "The map will grow from accepted learning evidence."}</p>
            </article>
            <article>
              <span>{learnerMap.blockers.length ? "Needs attention" : "Opens next"}</span>
              <strong>{learnerMap.blockers[0] || learnerMap.nextDirections[0] || "Keep working the frontier"}</strong>
            </article>
          </div>
        </section>

        <ReviewSuggestions snapshot={snapshot} />

        <footer className={styles.todayFooter}>
          <span>Learning state and evidence stay available in the advanced workspace.</span>
          <Link href="/workspace">Open Workspace →</Link>
        </footer>
      </main>
    </div>
  );
}
