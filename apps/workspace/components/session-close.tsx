"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionCloseDraft } from "@/lib/session-close";
import styles from "./session-close.module.css";

export function SessionCloseView({
  projectTitle,
  preview,
  currentRevision,
}: {
  projectTitle: string;
  preview: SessionCloseDraft;
  currentRevision: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function closeSession() {
    if (saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const response = await fetch("/api/session-close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedRevision: currentRevision }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not close the session.");
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not close the session.");
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/focus">← Back to Focus</Link>
        <div>
          <span>Session Close</span>
          <strong>{projectTitle}</strong>
        </div>
      </header>

      <section className={styles.hero}>
        <span>Leave with trustworthy continuity</span>
        <h1>Close the loop without inventing progress.</h1>
        <p>{preview.evidenceSummary}</p>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <span>Capability change</span>
          {preview.capabilityChange ? (
            <>
              <strong>{preview.capabilityChange.concept}</strong>
              <p>{preview.capabilityChange.before} → {preview.capabilityChange.after}</p>
              <small>This appears only because an accepted state decision cites this session&apos;s Evidence.</small>
            </>
          ) : (
            <>
              <strong>No accepted mastery change from this turn</strong>
              <p>The Evidence can still shape the next move without becoming a stronger capability claim.</p>
            </>
          )}
        </section>

        <section className={styles.card}>
          <span>Unresolved uncertainty</span>
          {preview.unresolved ? (
            <>
              <strong>{preview.unresolved.target}</strong>
              <p>{preview.unresolved.rationale}</p>
              <small>{preview.unresolved.uncertainty} uncertainty</small>
            </>
          ) : (
            <p>No next unresolved Runtime decision is currently recorded.</p>
          )}
        </section>

        <section className={styles.card}>
          <span>Saved this turn</span>
          {preview.materials.length ? (
            <ul>{preview.materials.map((item) => <li key={item.id}>{item.title}</li>)}</ul>
          ) : (
            <p>No LearningMaterial is linked to this turn&apos;s Evidence.</p>
          )}
          {preview.pendingProposalCount ? (
            <small>{preview.pendingProposalCount} proposal{preview.pendingProposalCount === 1 ? "" : "s"} still need review.</small>
          ) : (
            <small>No pending state or topology proposals.</small>
          )}
        </section>

        <section className={styles.card + " " + styles.seed}>
          <span>Tomorrow Seed</span>
          {preview.tomorrowSeed ? (
            <>
              <strong>{preview.tomorrowSeed.target}</strong>
              <p>{preview.tomorrowSeed.action}</p>
              <small>Operational continuity only. It creates no Evidence and becomes stale when the Runtime Decision changes.</small>
            </>
          ) : (
            <p>No unanswered next Decision is available to seed the next opening.</p>
          )}
        </section>
      </div>

      <footer className={styles.footer}>
        <p>{error || "This save does not write mastery, Map, Evidence, or Completion."}</p>
        <button type="button" onClick={closeSession} disabled={saving}>
          {saving ? "Closing…" : "Close session and return to Today"}
        </button>
      </footer>
    </main>
  );
}
