"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompletionGateStatus } from "@/lib/completion-status";
import { derivePaperCompletionProgress } from "@/lib/paper-completion";
import type { ProjectStatus } from "@/lib/types";

interface CompletionResponse {
  completion?: CompletionGateStatus;
  error?: string;
}

const labels = {
  configuration_required: "Completion contract pending",
  collecting_evidence: "Completion evidence",
  ready: "Ready to complete",
  completed: "Verified completion",
  unverified_completed: "Archived without verification",
} as const;

function detail(status: CompletionGateStatus): string {
  if (status.status === "configuration_required") {
    return "The Agent will define observable Feynman and independent-performance gates after diagnostic evidence.";
  }
  if (status.status === "unverified_completed") {
    return "This Mission has no immutable Completion Gate record. Archive alone is not proof of learning.";
  }
  if (status.status === "completed") {
    return "The required capabilities passed with distinct Evidence. The Project remains available for maintenance.";
  }
  if (status.status === "ready") {
    return "All required capabilities have qualifying, distinct Evidence. The Runtime will validate once more before Archive.";
  }
  if (
    status.passedRequiredCount === status.requiredCount
    && !status.hasDistinctEvidence
  ) return "The criteria pass individually, but Feynman and performance still need distinct Evidence receipts.";
  return `${status.passedRequiredCount} of ${status.requiredCount} required capabilities currently pass.`;
}

export function CompletionGate({
  projectId,
  projectStatus,
}: {
  projectId: string;
  projectStatus?: ProjectStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<CompletionGateStatus>();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetch("/api/completion", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as CompletionResponse;
        if (!response.ok || !body.completion) {
          throw new Error(body.error || "Completion status is unavailable.");
        }
        setStatus(body.completion);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Completion status is unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [projectId]);

  async function complete() {
    if (
      completing
      || status?.status !== "ready"
      || !window.confirm(
        "Complete this Mission and Archive the retained Project? The Runtime will re-check every required Evidence gate.",
      )
    ) return;
    setCompleting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/completion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "complete", projectId }),
      });
      const body = await response.json() as CompletionResponse;
      if (!response.ok || !body.completion) {
        throw new Error(body.error || "Could not complete this Mission.");
      }
      setStatus(body.completion);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete this Mission.");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return <div className="completion-card completion-card--loading">Checking completion Evidence…</div>;
  }
  if (!status) {
    return error ? <div className="completion-card completion-card--error">{error}</div> : null;
  }
  const administrativelyArchived = projectStatus === "archived"
    && status.status !== "completed";
  const visualStatus = administrativelyArchived ? "unverified_completed" : status.status;
  const statusDetail = administrativelyArchived
    ? "This Project was archived administratively. Its retained state is readable, but no verified completion was recorded."
    : detail(status);
  const paperProgress = derivePaperCompletionProgress(status);

  return (
    <section className={`completion-card completion-card--${visualStatus}`} aria-live="polite">
      <div className="completion-card__header">
        <div>
          <span>Mission gate</span>
          <strong>{labels[visualStatus]}</strong>
        </div>
        {status.requiredCount > 0 ? (
          <b>{status.passedRequiredCount}/{status.requiredCount}</b>
        ) : null}
      </div>
      <p>{statusDetail}</p>
      {paperProgress ? (
        <small className="completion-card__provenance">
          Paper understanding: {paperProgress.passed}/{paperProgress.required} capabilities
          {" · "}delayed retrieval {paperProgress.delayedRetrievalPassed ? "verified" : "pending"}
          {" · "}transfer {paperProgress.transferPassed ? "verified" : "pending"}
        </small>
      ) : null}

      {status.criteria.length > 0 ? (
        <details className="completion-criteria">
          <summary>Inspect capability Evidence</summary>
          <div>
            {status.criteria.map((criterion) => (
              <article key={criterion.id}>
                <span aria-hidden="true">{criterion.passed ? "✓" : "○"}</span>
                <div>
                  <strong>{criterion.capability}</strong>
                  <small>
                    {criterion.kind} · {criterion.qualifyingEvidenceIds.length}/{criterion.minimumEvidence} Evidence
                    {!criterion.required ? " · optional" : ""}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      {status.status === "ready" && projectStatus === "active" ? (
        <button type="button" disabled={completing} onClick={complete}>
          {completing ? "Validating…" : "Complete and archive"}
        </button>
      ) : null}
      {status.status === "completed" && status.completedAt ? (
        <small className="completion-card__provenance">
          Recorded {new Date(status.completedAt).toLocaleDateString()}
        </small>
      ) : null}
      {error ? <small className="completion-card__error">{error}</small> : null}
    </section>
  );
}
