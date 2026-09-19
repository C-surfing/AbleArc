"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LearnerProfile, LearnerProfilePatch } from "@/lib/learner-profile";
import styles from "./learner-profile-editor.module.css";

const fields: Array<{
  key: keyof LearnerProfilePatch;
  label: string;
  group: string;
  placeholder: string;
}> = [
  { key: "preferredLanguage", label: "Preferred language", group: "Communication", placeholder: "Chinese, English, bilingual…" },
  { key: "detailLevel", label: "Level of detail", group: "Communication", placeholder: "Concise by default; detailed for derivations…" },
  { key: "intuitionFormalism", label: "Intuition / formalism", group: "Communication", placeholder: "Intuition first, then formal derivation…" },
  { key: "socraticTolerance", label: "Socratic interaction", group: "Learning style", placeholder: "Low / moderate / high, with any nuance…" },
  { key: "preferredPace", label: "Preferred pace", group: "Learning style", placeholder: "Fast on familiar material; slower on proofs…" },
  { key: "priorExposure", label: "Previous exposure", group: "Background", placeholder: "Courses or topics you have already seen…" },
  { key: "reportedStrengths", label: "Self-reported strengths", group: "Background", placeholder: "What currently feels strong…" },
  { key: "reportedWeaknesses", label: "Self-reported weaknesses", group: "Background", placeholder: "What currently feels shaky…" },
  { key: "technicalBackground", label: "Technical background", group: "Background", placeholder: "Software engineering, math, electronics…" },
  { key: "toolsAndLanguages", label: "Tools / languages", group: "Background", placeholder: "Python, C++, CUDA, STM32…" },
  { key: "longTermGoals", label: "Long-term learning goals", group: "Context", placeholder: "What should this learning compound toward?" },
  { key: "sourceContext", label: "Courses / source context", group: "Context", placeholder: "Current course, textbook, papers, lecture series…" },
  { key: "typicalSessionLength", label: "Typical session length", group: "Constraints", placeholder: "30–60 minutes…" },
  { key: "recurringConstraints", label: "Recurring constraints", group: "Constraints", placeholder: "Avoid setup repetition; preserve source notation…" },
];

export function LearnerProfileEditor({ initialProfile }: { initialProfile: LearnerProfile }) {
  const router = useRouter();
  const [profile, setProfile] = useState<LearnerProfile>(initialProfile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  function update(key: keyof LearnerProfilePatch, value: string) {
    setProfile((current) => ({ ...current, [key]: value || undefined }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const patch = Object.fromEntries(
        fields.map(({ key }) => [key, profile[key] || ""]),
      ) as LearnerProfilePatch;
      const response = await fetch("/api/learner-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedRevision: profile.revision, profile: patch }),
      });
      const body = await response.json() as { profile?: LearnerProfile; error?: string };
      if (!response.ok || !body.profile) throw new Error(body.error || "Could not save profile.");
      setProfile(body.profile);
      setMessage("Profile saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  const groups = [...new Set(fields.map((field) => field.group))];

  return (
    <form className={styles.editor} onSubmit={save}>
      {groups.map((group) => (
        <section key={group}>
          <header>
            <span>{group}</span>
          </header>
          <div className={styles.grid}>
            {fields.filter((field) => field.group === group).map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                <input
                  value={profile[field.key] || ""}
                  maxLength={1200}
                  onChange={(event) => update(field.key, event.target.value)}
                  placeholder={field.placeholder}
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <footer>
        <div>
          <strong>Self-report is routing context, not mastery.</strong>
          <span>These fields can shape explanations and avoid redundant questions. Capability still requires learner Evidence.</span>
        </div>
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </footer>
      {message ? <p className={styles.message} aria-live="polite">{message}</p> : null}
    </form>
  );
}
