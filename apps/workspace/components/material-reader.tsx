"use client";

import { useEffect, useState } from "react";
import type { LearningMaterialDetail } from "@/lib/learning-material-data";
import type { LearningMaterialSummary } from "@/lib/types";
import styles from "./material-reader.module.css";

interface MaterialCurationView {
  projectId: string;
  revision: number;
  selectedMaterialIds: string[];
  updatedAt?: string;
}

export function MaterialReader({ materials }: { materials: LearningMaterialSummary[] }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<LearningMaterialDetail>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [curation, setCuration] = useState<MaterialCurationView>();
  const [curationError, setCurationError] = useState<string>();
  const [savingId, setSavingId] = useState<string>();

  useEffect(() => {
    if (materials.length === 0) return undefined;
    let active = true;
    void fetch("/api/materials/curation", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { curation?: MaterialCurationView; error?: string };
        if (!response.ok || !payload.curation) {
          throw new Error(payload.error || "Material curation is unavailable.");
        }
        if (active) setCuration(payload.curation);
      })
      .catch((requestError) => {
        if (active) {
          setCurationError(requestError instanceof Error ? requestError.message : "Material curation is unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, [materials.length]);

  async function openMaterial(id: string) {
    if (selectedId === id) {
      setSelectedId(undefined);
      setDetail(undefined);
      setError(undefined);
      return;
    }
    setSelectedId(id);
    setDetail(undefined);
    setError(undefined);
    setLoading(true);
    try {
      const response = await fetch(`/api/materials/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json() as { material?: LearningMaterialDetail; error?: string };
      if (!response.ok || !payload.material) {
        throw new Error(payload.error || "Material detail is unavailable.");
      }
      setDetail(payload.material);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Material detail is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCuration(materialId: string) {
    if (!curation || savingId) return;
    const nextSelected = !curation.selectedMaterialIds.includes(materialId);
    setSavingId(materialId);
    setCurationError(undefined);
    try {
      const response = await fetch("/api/materials/curation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: curation.projectId,
          revision: curation.revision,
          materialId,
          selected: nextSelected,
        }),
      });
      const payload = await response.json() as { curation?: MaterialCurationView; error?: string };
      if (!response.ok || !payload.curation) {
        throw new Error(payload.error || "Material curation could not be saved.");
      }
      setCuration(payload.curation);
    } catch (requestError) {
      setCurationError(requestError instanceof Error ? requestError.message : "Material curation could not be saved.");
    } finally {
      setSavingId(undefined);
    }
  }

  const curatedCount = curation?.selectedMaterialIds.length ?? 0;

  return (
    <section className="state-section">
      <div className="section-heading">
        <span>Learning library</span>
        <small>{curation ? `${curatedCount} selected · ${materials.length} total` : materials.length}</small>
      </div>
      {curationError ? <p className="empty-copy">{curationError}</p> : null}
      {materials.slice(0, 5).map((item) => {
        const curated = curation?.selectedMaterialIds.includes(item.id) ?? false;
        return (
          <div className="material-card" key={item.id}>
            <div className="material-card__meta">
              <span>{item.materialType.replaceAll("_", " ")}</span>
              <span>{item.evidenceCount} evidence · {item.sourceCount} source</span>
            </div>
            <div className={styles.titleRow}>
              <button
                type="button"
                className={styles.openButton}
                aria-expanded={selectedId === item.id}
                onClick={() => void openMaterial(item.id)}
              >
                {item.title}
              </button>
              <button
                type="button"
                className={`${styles.curateButton} ${curated ? styles.curateButtonSelected : ""}`}
                aria-pressed={curated}
                disabled={!curation || Boolean(savingId)}
                onClick={() => void toggleCuration(item.id)}
                title="Explicit learner preference only; does not affect mastery or completion"
              >
                {savingId === item.id ? "Saving…" : curated ? "Selected" : "Select"}
              </button>
            </div>
            <p>{item.summary}</p>
            <small>Return when: {item.whyReturn}</small>
            {selectedId === item.id ? (
              <div className={styles.reader} aria-live="polite">
                {loading ? <p>Loading validated material…</p> : null}
                {error ? <p className="empty-copy">{error}</p> : null}
                {detail ? (
                  <>
                    <div className={styles.provenance}>
                      <span>Mission {detail.missionId}</span>
                      {detail.conceptIds.length ? <span>Concepts {detail.conceptIds.join(", ")}</span> : null}
                      {detail.tags.length ? <span>Tags {detail.tags.join(", ")}</span> : null}
                      {detail.evidenceIds.length ? <span>Evidence {detail.evidenceIds.join(", ")}</span> : null}
                    </div>
                    <pre className={styles.body}>{detail.bodyMarkdown}</pre>
                    {detail.sourceRefs.length ? (
                      <div className={styles.sources}>
                        <strong>Sources</strong>
                        {detail.sourceRefs.map((source) => <span key={source}>{source}</span>)}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {materials.length === 0 ? (
        <p className="empty-copy">No reusable material has been deliberately saved.</p>
      ) : null}
    </section>
  );
}
