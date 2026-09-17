"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LearningMapProposalReview as ProposalReview } from "@/lib/learning-map-proposal-review";
import type { MaintenanceStatus, ProjectStatus } from "@/lib/types";
import styles from "./map-proposal-review.module.css";

interface ProposalResponse {
  proposals?: ProposalReview[];
  error?: string;
}

function joined(items: string[]): string {
  return items.length ? items.join(" · ") : "—";
}

export function MapProposalReview({
  projectId,
  projectStatus,
  maintenanceStatus,
}: {
  projectId: string;
  projectStatus?: ProjectStatus;
  maintenanceStatus?: MaintenanceStatus;
}) {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalReview[]>();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    void fetch("/api/map-proposals", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as ProposalResponse;
        if (!response.ok || !payload.proposals) {
          throw new Error(payload.error || "Roadmap proposals are unavailable.");
        }
        setProposals(payload.proposals);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Roadmap proposals are unavailable.");
      });
    return () => controller.abort();
  }, [projectId]);

  const proposal = proposals?.[0];
  const writable = projectStatus === "active"
    || (projectStatus === "archived" && maintenanceStatus === "study_active");
  const canSubmit = Boolean(proposal && writable && reason.trim() && !submitting);
  const canAccept = Boolean(canSubmit && !proposal?.stale);
  const statusCopy = useMemo(() => {
    if (!proposal) return undefined;
    if (proposal.stale) {
      return `Canonical Map is now revision ${proposal.currentRevision}; this proposal was grounded on revision ${proposal.baseRevision}.`;
    }
    return `Accepting creates revision ${proposal.baseRevision + 1}. It changes topology/frontier only; accepted mastery remains untouched.`;
  }, [proposal]);

  async function decide(decision: "accepted" | "rejected") {
    if (!proposal || !canSubmit || (decision === "accepted" && !canAccept)) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/map-proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          proposalId: proposal.id,
          decision,
          reason: reason.trim(),
        }),
      });
      const payload = await response.json() as ProposalResponse;
      if (!response.ok || !payload.proposals) {
        throw new Error(payload.error || "The roadmap proposal decision could not be recorded.");
      }
      setProposals(payload.proposals);
      setReason("");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The roadmap proposal decision could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!proposal) {
    if (error) return <p className={styles.empty}>{error}</p>;
    if (proposals) return <p className={styles.empty}>No pending roadmap revision proposal.</p>;
    return <p className={styles.empty}>Checking roadmap proposals…</p>;
  }

  return (
    <section className={styles.card} aria-label="Roadmap revision proposal review">
      <div className={styles.heading}>
        <strong>Roadmap proposal</strong>
        <span>{proposals?.length ?? 1} pending · r{proposal.baseRevision} → r{proposal.baseRevision + 1}</span>
      </div>
      <p className={styles.rationale}>{proposal.rationale}</p>
      <div className={styles.meta}>
        <span>{proposal.evidenceCount} evidence receipt(s)</span>
        <span>proposed by {proposal.proposedBy}</span>
      </div>
      <div className={styles.delta}>
        <div><b>+ nodes</b><span>{joined(proposal.changes.addedNodes)}</span></div>
        <div><b>− nodes</b><span>{joined(proposal.changes.removedNodes)}</span></div>
        <div><b>~ nodes</b><span>{joined(proposal.changes.changedNodes)}</span></div>
        <div><b>+ edges</b><span>{joined(proposal.changes.addedEdges)}</span></div>
        <div><b>− edges</b><span>{joined(proposal.changes.removedEdges)}</span></div>
        <div><b>~ edges</b><span>{joined(proposal.changes.changedEdges)}</span></div>
        <div><b>frontier</b><span>{joined(proposal.changes.frontier)}</span></div>
      </div>
      {statusCopy ? <p className={proposal.stale ? styles.warning : styles.status}>{statusCopy}</p> : null}
      <label className={styles.reason}>
        <span>Your rationale</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value.slice(0, 600))}
          placeholder="Why should this topology revision be accepted or rejected?"
          rows={2}
          disabled={!writable || submitting}
        />
      </label>
      {!writable ? <p className={styles.warning}>This Project is read-only; resume it or enter maintenance study before deciding.</p> : null}
      {error ? <p className={styles.warning}>{error}</p> : null}
      <div className={styles.actions}>
        <button type="button" onClick={() => void decide("rejected")} disabled={!canSubmit}>
          Reject
        </button>
        <button type="button" onClick={() => void decide("accepted")} disabled={!canAccept}>
          Accept topology revision
        </button>
      </div>
    </section>
  );
}
