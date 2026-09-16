"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectSummary } from "@/lib/types";

type ProjectAction =
  | "switch"
  | "pause"
  | "resume"
  | "archive"
  | "maintenance-start";

export function ProjectSwitcher({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const current = projects.find((project) => project.selected);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not update the Project.");
      setCreating(false);
      setTitle("");
      setGoal("");
      setWhy("");
      menu.current?.removeAttribute("open");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the Project.");
    } finally {
      setBusy(false);
    }
  }

  function act(action: ProjectAction, projectId: string) {
    if (
      action === "archive"
      && !window.confirm(
        "Archive without verified completion? State is retained and becomes read-only, but the Completion Gate will not be marked passed.",
      )
    ) return;
    return send({ action, projectId });
  }

  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !goal.trim() || busy) return;
    return send({ action: "create", title, goal, why });
  }

  return (
    <details className="project-switcher" ref={menu}>
      <summary aria-label="Open Project menu">
        <span className="project-switcher__eyebrow">Project</span>
        <strong>{current?.title || "Create a Project"}</strong>
        <span className="project-switcher__chevron">⌄</span>
      </summary>
      <div className="project-menu">
        <header>
          <div>
            <span className="section-kicker">Local Projects</span>
            <strong>Choose the learning line</strong>
          </div>
          <button type="button" onClick={() => setCreating((value) => !value)}>
            {creating ? "Cancel" : "+ New"}
          </button>
        </header>

        {creating ? (
          <form className="project-create" onSubmit={createProject}>
            <label>
              <span>Project title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder="Transformer from first principles"
                required
              />
            </label>
            <label>
              <span>Observable capability</span>
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                maxLength={1200}
                rows={3}
                placeholder="Implement and debug self-attention independently"
                required
              />
            </label>
            <label>
              <span>Why it matters <small>optional</small></span>
              <input
                value={why}
                onChange={(event) => setWhy(event.target.value)}
                maxLength={2400}
              />
            </label>
            <button className="project-create__submit" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create and open"}
            </button>
          </form>
        ) : null}

        <div className="project-list">
          {projects.length === 0 ? (
            <p className="project-menu__empty">No local Project yet. Start with one capability goal.</p>
          ) : projects.map((project) => {
            const reviewActive = project.status === "archived"
              && project.maintenanceStatus === "study_active";
            const action = project.status === "archived" && !reviewActive
              ? "maintenance-start"
              : "switch";
            return (
              <div className={`project-row ${project.selected ? "is-current" : ""}`} key={project.id}>
                <div>
                  <strong>{project.title}</strong>
                  <span>
                    {project.status}
                    {project.maintenanceStatus !== "none" ? ` · ${project.maintenanceStatus.replace("_", " ")}` : ""}
                  </span>
                </div>
                {project.selected ? (
                  <span className="project-row__current">Current</span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(action, project.id)}
                  >
                    {action === "maintenance-start" ? "Start review" : reviewActive ? "Open review" : "Open"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {current ? (
          <div className="project-actions">
            {current.status === "active" ? (
              <>
                <button type="button" disabled={busy} onClick={() => act("pause", current.id)}>Pause</button>
                <button type="button" disabled={busy} onClick={() => act("archive", current.id)}>Archive</button>
              </>
            ) : null}
            {current.status === "paused" ? (
              <>
                <button type="button" disabled={busy} onClick={() => act("resume", current.id)}>Resume</button>
                <button type="button" disabled={busy} onClick={() => act("archive", current.id)}>Archive</button>
              </>
            ) : null}
            {current.status === "archived" && current.maintenanceStatus !== "study_active" ? (
              <button type="button" disabled={busy} onClick={() => act("maintenance-start", current.id)}>
                Start maintenance review
              </button>
            ) : null}
            {current.status === "archived" && current.maintenanceStatus === "study_active" ? (
              <p className="project-actions__note">
                Review is writable. The connected Agent closes it after interpreting the recorded evidence.
              </p>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="project-menu__error" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
