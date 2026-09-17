"use client";

import { useEffect, useState } from "react";
import type { LearnerStateReplay } from "@/lib/learner-state-replay";
import styles from "./session-state-replay.module.css";

interface ReplayResponse {
  replay?: LearnerStateReplay;
  error?: string;
}

export function SessionStateReplay({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState<LearnerStateReplay>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setOpen(false);
    setReplay(undefined);
    setError(undefined);
  }, [projectId]);

  useEffect(() => {
    if (!open || replay || loading) return;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void fetch(`/api/state-replay?projectId=${encodeURIComponent(projectId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as ReplayResponse;
        if (!response.ok || !payload.replay) {
          throw new Error(payload.error || "Learner-state replay is unavailable.");
        }
        setReplay(payload.replay);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Learner-state replay is unavailable.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [loading, open, projectId, replay]);

  return (
    <div className={styles.replay}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>State replay</span>
        <small>{open ? "hide" : "learner-model changes"}</small>
      </button>
      {open ? (
        <div className={styles.panel}>
          <div className={styles.heading}>
            <div>
              <strong>Learner-model diff</strong>
              <span>Accepted state transitions only · Runtime revision {replay?.runtimeRevision ?? "—"}</span>
            </div>
          </div>
          {loading ? <p className={styles.empty}>Verifying immutable state decisions…</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {!loading && !error && replay?.events.length === 0 ? (
            <p className={styles.empty}>No accepted learner-state transitions yet.</p>
          ) : null}
          {replay?.events.map((event) => (
            <article className={styles.event} key={event.decisionId}>
              <div className={styles.transition}>
                <strong>{event.conceptLabel}</strong>
                <span>{event.before} → {event.after}</span>
              </div>
              <div className={styles.meta}>
                <span>{event.evidenceCount} Evidence</span>
                <span>{event.authority}</span>
                {event.policyOverridden ? <strong>policy override</strong> : null}
              </div>
              {event.turn ? (
                <div className={styles.turn}>
                  <span>{event.turn.outcome.replaceAll("_", " ")}</span>
                  <p>{event.turn.summary}</p>
                </div>
              ) : null}
              <p className={styles.reason}>{event.reason}</p>
            </article>
          ))}
          <p className={styles.boundary}>
            Replay is derived from accepted immutable StateDecision receipts. Rejected proposals and chat messages are not learner-model changes.
          </p>
        </div>
      ) : null}
    </div>
  );
}
