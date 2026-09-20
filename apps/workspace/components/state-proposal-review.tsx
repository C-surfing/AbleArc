"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MaintenanceStatus, ProjectStatus } from "@/lib/types";
import type { StateProposalReview as ProposalReview } from "@/lib/state-proposal-review";
import styles from "./state-proposal-review.module.css";

interface ProposalResponse {
  proposals?: ProposalReview[];
  error?: string;
}

export function StateProposalReview({
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
  const [overridePolicy, setOverridePolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const writable = projectStatus === "active"
    || (projectStatus === "archived" && maintenanceStatus === "study_active");

  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    void fetch("/api/state-proposals", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as ProposalResponse;
        if (!response.ok || !payload.proposals) {
          throw new Error(payload.error || "State proposals are unavailable.");
        }
        if (writable && payload.proposals.some((item) => item.autoAcceptEligible)) {
          const reconcileResponse = await fetch("/api/state-proposals", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "reconcile", projectId }),
            signal: controller.signal,
          });
          const reconciled = await reconcileResponse.json() as ProposalResponse;
          if (!reconcileResponse.ok || !reconciled.proposals) {
            throw new Error(reconciled.error || "Low-risk state reconciliation failed.");
          }
          setProposals(reconciled.proposals);
          router.refresh();
          return;
        }
        setProposals(payload.proposals);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "State proposals are unavailable.");
      });
    return () => controller.abort();
  }, [projectId, router, writable]);

  const proposal = proposals?.[0];
  const hasPolicyIssues = Boolean(proposal?.policyIssues.length);
  const canSubmit = Boolean(proposal && writable && reason.trim() && !submitting);
  const canAccept = Boolean(canSubmit && !proposal?.stale && (!hasPolicyIssues || overridePolicy));
  const statusCopy = useMemo(() => {
    if (!proposal) return undefined;
    if (proposal.stale) return `Current state is ${proposal.currentState}; this proposal expected ${proposal.before}.`;
    if (hasPolicyIssues) return "The Runtime transition policy does not approve this acceptance without an explicit learner override.";
    if (proposal.risk === "high") return "High-risk learner-state changes remain explicit learner decisions.";
    return "This proposal remains reviewable. Your decision becomes an immutable learner-authority receipt.";
  }, [hasPolicyIssues, proposal]);

  async function decide(decision: "accepted" | "rejected") {
    if (!proposal || !canSubmit || (decision === "accepted" && !canAccept)) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/state-proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          proposalId: proposal.id,
          decision,
          reason: reason.trim(),
          overridePolicy: decision === "accepted" && hasPolicyIssues ? overridePolicy : false,
        }),
      });
      const payload = await response.json() as ProposalResponse;
      if (!response.ok || !payload.proposals) {
        throw new Error(payload.error || "The state proposal decision could not be recorded.");
      }
      setProposals(payload.proposals);
      setReason("");
      setOverridePolicy(false);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The state proposal decision could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!proposal && !error) return null;

  return (
    <section className="state-section">
      <div className="section-heading">
        <span>State proposal review</span>
        <small>{proposal ? `${proposals?.length ?? 1} pending` : "unavailable"}</small>
      </div>
      {error && !proposal ? <p className="empty-copy">{error}</p> : null}
      {proposal ? (
        <div className={styles.card}>
          <div className={styles.transition}>
            <strong>{proposal.concept}</strong>
            <span>{proposal.before} → {proposal.after}</span>
          </div>
          <p>{proposal.rationale}</p>
          <div className={styles.meta}>
            <span>{proposal.evidenceCount} supporting evidence item(s)</span>
            <span>{proposal.risk} risk</span>
            <span>proposed by {proposal.proposedBy}</span>
          </div>
          {statusCopy ? <p className={proposal.stale || hasPolicyIssues ? styles.warning : styles.status}>{statusCopy}</p> : null}
          {proposal.policyIssues.length ? (
            <ul className={styles.issues}>
              {proposal.policyIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          ) : null}
          <label className={styles.reason}>
            <span>Your rationale</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 600))}
              placeholder="Why should this proposal be accepted or rejected?"
              rows={3}
              disabled={!writable || submitting}
            />
          </label>
          {hasPolicyIssues && !proposal.stale ? (
            <label className={styles.override}>
              <input
                type="checkbox"
                checked={overridePolicy}
                onChange={(event) => setOverridePolicy(event.target.checked)}
                disabled={!writable || submitting}
              />
              <span>I explicitly understand and override these conservative Runtime policy checks.</span>
            </label>
          ) : null}
          {!writable ? <p className={styles.warning}>This Project is read-only; resume it or enter maintenance study before deciding.</p> : null}
          {error ? <p className={styles.warning}>{error}</p> : null}
          <div className={styles.actions}>
            <button type="button" onClick={() => void decide("rejected")} disabled={!canSubmit}>
              Reject
            </button>
            <button type="button" onClick={() => void decide("accepted")} disabled={!canAccept}>
              {hasPolicyIssues ? "Accept with override" : "Accept"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
