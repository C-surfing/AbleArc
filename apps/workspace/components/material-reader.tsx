"use client";

import { useState } from "react";
import type { LearningMaterialDetail } from "@/lib/learning-material-data";
import type { LearningMaterialSummary } from "@/lib/types";
import styles from "./material-reader.module.css";

export function MaterialReader({ materials }: { materials: LearningMaterialSummary[] }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<LearningMaterialDetail>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

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

  return (
    <section className="state-section">
      <div className="section-heading"><span>Learning library</span><small>{materials.length}</small></div>
      {materials.slice(0, 5).map((item) => (
        <div className="material-card" key={item.id}>
          <div className="material-card__meta">
            <span>{item.materialType.replaceAll("_", " ")}</span>
            <span>{item.evidenceCount} evidence · {item.sourceCount} source</span>
          </div>
          <button
            type="button"
            className={styles.openButton}
            aria-expanded={selectedId === item.id}
            onClick={() => void openMaterial(item.id)}
          >
            {item.title}
          </button>
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
      ))}
      {materials.length === 0 ? (
        <p className="empty-copy">No reusable material has been deliberately saved.</p>
      ) : null}
    </section>
  );
}
