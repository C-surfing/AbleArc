"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReflectionContextMode, ReflectionRecord } from "@/lib/reflection";
import styles from "./reflection-studio.module.css";

interface MaterialOption {
  id: string;
  title: string;
}

export function ReflectionStudio({
  projectId,
  projectTitle,
  missionId,
  currentDecisionId,
  currentConceptIds,
  materials,
  initialReflections,
}: {
  projectId: string;
  projectTitle: string;
  missionId?: string;
  currentDecisionId?: string;
  currentConceptIds: string[];
  materials: MaterialOption[];
  initialReflections: ReflectionRecord[];
}) {
  const [reflections, setReflections] = useState(initialReflections);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = useMemo(
    () => reflections.find((item) => item.id === selectedId),
    [reflections, selectedId],
  );
  const [body, setBody] = useState("");
  const [linkCurrent, setLinkCurrent] = useState(true);
  const [contextMode, setContextMode] = useState<ReflectionContextMode>("preserve");
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function openNew() {
    setSelectedId(undefined);
    setBody("");
    setLinkCurrent(true);
    setContextMode("preserve");
    setMaterialIds([]);
    setError(undefined);
  }

  function openReflection(item: ReflectionRecord) {
    setSelectedId(item.id);
    setBody(item.body);
    setContextMode("preserve");
    setMaterialIds(item.links.materialIds);
    setError(undefined);
  }

  function toggleMaterial(materialId: string) {
    setMaterialIds((current) => (
      current.includes(materialId)
        ? current.filter((item) => item !== materialId)
        : [...current, materialId]
    ));
  }

  async function save() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const payload = selected
        ? {
            action: "update",
            expectedProjectId: projectId,
            reflectionId: selected.id,
            expectedRevision: selected.revision,
            body,
            contextMode,
            materialIds,
          }
        : {
            action: "create",
            expectedProjectId: projectId,
            body,
            linkCurrent,
            materialIds,
          };
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { reflection?: ReflectionRecord; error?: string };
      if (!response.ok || !result.reflection) {
        throw new Error(result.error || "Could not save Reflection.");
      }
      setReflections((current) => [
        result.reflection!,
        ...current.filter((item) => item.id !== result.reflection!.id),
      ]);
      openReflection(result.reflection);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save Reflection.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          expectedProjectId: projectId,
          reflectionId: selected.id,
          expectedRevision: selected.revision,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not delete Reflection.");
      setReflections((current) => current.filter((item) => item.id !== selected.id));
      openNew();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete Reflection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/">← Today</Link>
          <span>Reflection · {projectTitle}</span>
        </div>
        <button type="button" onClick={openNew}>New reflection</button>
      </header>

      <section className={styles.intro}>
        <span>Learner-owned space</span>
        <h1>Write what is useful to you.</h1>
        <p>
          No prompt is required. Reflection stays separate from Evidence and cannot change mastery,
          the LearningMap, or Mission completion.
        </p>
      </section>

      <div className={styles.layout}>
        <aside className={styles.history}>
          <div className={styles.historyHeader}>
            <strong>Recent reflections</strong>
            <small>{reflections.length}</small>
          </div>
          {reflections.length ? reflections.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selectedId === item.id ? styles.activeItem : styles.historyItem}
              onClick={() => openReflection(item)}
            >
              <strong>{item.body.slice(0, 72)}</strong>
              <span>{new Date(item.updatedAt).toLocaleString()}</span>
              <small>
                {item.links.conceptIds.length || item.links.materialIds.length || item.links.missionId
                  ? "linked context"
                  : "unlinked"}
              </small>
            </button>
          )) : (
            <p className={styles.empty}>No reflections yet. This space stays empty until you choose to use it.</p>
          )}
        </aside>

        <section className={styles.editor}>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={20000}
            rows={16}
            placeholder="Write a thought, uncertainty, connection, question, or anything else worth keeping…"
            aria-label="Reflection text"
          />

          <div className={styles.contextCard}>
            <div>
              <span>Optional context links</span>
              <p>Links improve later orientation. They still do not make this text Evidence.</p>
            </div>

            {selected ? (
              <fieldset>
                <legend>Learning context</legend>
                <label>
                  <input
                    type="radio"
                    name="context-mode"
                    checked={contextMode === "preserve"}
                    onChange={() => setContextMode("preserve")}
                  />
                  Preserve saved links
                </label>
                <label>
                  <input
                    type="radio"
                    name="context-mode"
                    checked={contextMode === "current"}
                    onChange={() => setContextMode("current")}
                  />
                  Relink to current Mission / Decision / frontier
                </label>
                <label>
                  <input
                    type="radio"
                    name="context-mode"
                    checked={contextMode === "none"}
                    onChange={() => setContextMode("none")}
                  />
                  Clear learning-context links
                </label>
              </fieldset>
            ) : (
              <label className={styles.contextToggle}>
                <input
                  type="checkbox"
                  checked={linkCurrent}
                  onChange={(event) => setLinkCurrent(event.target.checked)}
                />
                Link this Reflection to the current learning context
              </label>
            )}

            {(missionId || currentDecisionId || currentConceptIds.length) ? (
              <small className={styles.currentContext}>
                Current context:
                {missionId ? " Current mission" : ""}
                {currentDecisionId ? " · Current learning move" : ""}
                {currentConceptIds.length ? " · focus " + currentConceptIds.join(", ") : ""}
              </small>
            ) : null}

            {materials.length ? (
              <details>
                <summary>Link LearningMaterials ({materialIds.length})</summary>
                <div className={styles.materialList}>
                  {materials.map((material) => (
                    <label key={material.id}>
                      <input
                        type="checkbox"
                        checked={materialIds.includes(material.id)}
                        onChange={() => toggleMaterial(material.id)}
                      />
                      <span>{material.title}</span>
                    </label>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          <footer className={styles.actions}>
            <p>{error || "Saving this record writes only learner-owned Reflection storage."}</p>
            <div>
              {selected ? (
                <button className={styles.deleteButton} type="button" onClick={remove} disabled={busy}>
                  Delete
                </button>
              ) : null}
              <button className={styles.saveButton} type="button" onClick={save} disabled={busy || !body.trim()}>
                {busy ? "Saving…" : selected ? "Save changes" : "Save reflection"}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
