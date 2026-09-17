"use client";

import { useEffect, useState } from "react";
import type {
  LearningMapNodeHistory,
  LearningMapNodeHistorySnapshot,
} from "@/lib/learning-map-history";
import styles from "./map-node-history.module.css";

interface HistoryResponse {
  history?: LearningMapNodeHistory;
  error?: string;
}

function Snapshot({ label, value }: { label: string; value?: LearningMapNodeHistorySnapshot }) {
  return (
    <div className={styles.snapshot}>
      <b>{label}</b>
      {value ? (
        <>
          <span>{value.label}</span>
          <small>{value.kind} · {value.missionRelevance}{value.frontier ? " · frontier" : ""}</small>
          {value.relations.length ? (
            <div className={styles.relations}>
              {value.relations.map((relation) => <small key={relation}>{relation}</small>)}
            </div>
          ) : <small>No semantic relations</small>}
        </>
      ) : <small>Node absent</small>}
    </div>
  );
}

export function MapNodeHistory({ projectId, nodeId }: { projectId: string; nodeId: string }) {
  const [history, setHistory] = useState<LearningMapNodeHistory>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setHistory(undefined);
    void fetch(`/api/map-history/${encodeURIComponent(nodeId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as HistoryResponse;
        if (!response.ok || !payload.history) {
          throw new Error(payload.error || "LearningMap node history is unavailable.");
        }
        if (payload.history.projectId !== projectId || payload.history.nodeId !== nodeId) {
          throw new Error("LearningMap history scope changed while loading.");
        }
        setHistory(payload.history);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "LearningMap node history is unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [nodeId, projectId]);

  return (
    <section className={styles.root} aria-label="Node revision history">
      <div className={styles.heading}>
        <strong>Revision history</strong>
        {history ? <small>canonical r{history.currentRevision}</small> : null}
      </div>
      {loading ? <p className={styles.empty}>Loading meaningful structural changes…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error && history?.events.length === 0 ? (
        <p className={styles.empty}>No recorded topology revision has changed this node yet.</p>
      ) : null}
      {history?.events.length ? (
        <div className={styles.events}>
          {history.events.map((event) => (
            <article className={styles.event} key={`${event.revision}:${event.updatedAt}`}>
              <div className={styles.eventHeader}>
                <strong>Revision {event.revision}</strong>
                <div className={styles.changes}>
                  {event.changes.map((change) => (
                    <span key={change}>{change.replaceAll("_", " ")}</span>
                  ))}
                </div>
              </div>
              <p className={styles.rationale}>{event.rationale}</p>
              <div className={styles.meta}>
                <span>{event.evidenceCount} evidence receipt(s)</span>
                <span>{event.updatedAt}</span>
              </div>
              <div className={styles.compare}>
                <Snapshot label="Before" value={event.before} />
                <Snapshot label="After" value={event.after} />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
