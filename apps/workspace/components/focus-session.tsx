"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DailyContext } from "@/lib/daily-context";
import { deriveDailyRecommendation } from "@/lib/daily-recommendation";
import { focusScaffolds, focusSessionMode, isFocusSessionWritable } from "@/lib/focus-session";
import type { WorkspaceSnapshot } from "@/lib/types";
import { LearningCanvas } from "./learning-canvas";
import styles from "./focus-session.module.css";

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function defaultTimerMinutes(context?: DailyContext): number {
  if (!context?.availableMinutes) return 25;
  return Math.max(5, Math.min(context.availableMinutes, 90));
}

export function FocusSession({
  snapshot,
  dailyContext,
}: {
  snapshot: WorkspaceSnapshot;
  dailyContext?: DailyContext;
}) {
  const initialMinutes = useMemo(() => defaultTimerMinutes(dailyContext), [dailyContext]);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const [scaffoldLevel, setScaffoldLevel] = useState(0);
  const recommendation = useMemo(
    () => deriveDailyRecommendation(snapshot, dailyContext),
    [snapshot, dailyContext],
  );
  const scaffolds = useMemo(() => focusScaffolds(snapshot), [snapshot]);
  const writable = isFocusSessionWritable(snapshot);
  const mode = focusSessionMode(snapshot);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    setScaffoldLevel(0);
  }, [snapshot.projectId, snapshot.decision?.id]);

  function resetTimer() {
    setTimerRunning(false);
    setRemainingSeconds(initialMinutes * 60);
  }

  function revealScaffold() {
    setScaffoldLevel((current) => Math.min(current + 1, scaffolds.length));
  }

  return (
    <div className={styles.focusPage}>
      <header className={styles.focusHeader}>
        <div className={styles.headerIdentity}>
          <Link href="/" aria-label="Back to Today">←</Link>
          <span className={styles.brandMark}>AA</span>
          <div>
            <strong>Focus</strong>
            <small>{snapshot.projectTitle || "Current Project"}</small>
          </div>
        </div>

        <div className={styles.headerCenter}>
          <span>{snapshot.frontier}</span>
        </div>

        <div className={styles.headerActions}>
          {timerVisible ? (
            <div className={styles.timer} aria-label="Optional focus timer">
              <strong aria-live="polite">{formatTimer(remainingSeconds)}</strong>
              <button type="button" onClick={() => setTimerRunning((running) => !running)} disabled={remainingSeconds === 0}>
                {timerRunning ? "Pause" : remainingSeconds === 0 ? "Done" : "Start"}
              </button>
              <button type="button" onClick={resetTimer}>Reset</button>
              <button type="button" onClick={() => { resetTimer(); setTimerVisible(false); }}>Hide</button>
            </div>
          ) : (
            <button className={styles.timerToggle} type="button" onClick={() => setTimerVisible(true)}>
              Timer · {initialMinutes}m
            </button>
          )}
          <Link className={styles.workspaceLink} href="/workspace">Workspace</Link>
        </div>
      </header>

      {!writable ? (
        <section className={styles.lifecycleBanner}>
          <div>
            <strong>This Project is read-only.</strong>
            <span>Focus can show the current learning state, but the Runtime will not accept a new evidence-bearing response.</span>
          </div>
          <Link href="/workspace">Manage lifecycle</Link>
        </section>
      ) : null}

      {!snapshot.decision ? (
        <section className={styles.lifecycleBanner}>
          <div>
            <strong>No structured learning decision is ready.</strong>
            <span>Use the Workspace to create or advance a Runtime-backed move before submitting evidence here.</span>
          </div>
          <Link href="/workspace">Open Workspace</Link>
        </section>
      ) : null}

      <div className={styles.focusBody}>
        <div className={styles.canvasColumn}>
          <LearningCanvas snapshot={snapshot} mode={mode} />
        </div>

        <aside className={styles.supportRail} aria-label="Focus Session support">
          <section className={styles.sessionShape}>
            <span>Session shape</span>
            <strong>{recommendation.moveType.replaceAll("-", " ")}</strong>
            <p>{recommendation.sessionShape}</p>
            {recommendation.contextRationale ? <small>{recommendation.contextRationale}</small> : null}
          </section>

          <section className={styles.scaffoldPanel}>
            <div className={styles.railHeading}>
              <span>Scaffold</span>
              <small>{scaffoldLevel}/{scaffolds.length}</small>
            </div>
            <p className={styles.scaffoldIntro}>
              Reveal only as much structure as you need. These prompts reuse Runtime boundaries; they do not supply the final answer.
            </p>
            {scaffolds.slice(0, scaffoldLevel).map((scaffold) => (
              <div className={styles.scaffoldItem} key={scaffold.level}>
                <span>{scaffold.label}</span>
                <p>{scaffold.text}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={revealScaffold}
              disabled={scaffoldLevel >= scaffolds.length}
            >
              {scaffoldLevel === 0
                ? "Need a scaffold"
                : scaffoldLevel >= scaffolds.length
                  ? "All scaffolds revealed"
                  : "Reveal one more"}
            </button>
          </section>

          <section className={styles.authorityNote}>
            <span>Authority boundary</span>
            <p>Timer and scaffold interactions are ephemeral UI context. They create no Evidence and cannot alter mastery, Map, or Completion.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
