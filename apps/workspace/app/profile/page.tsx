import Link from "next/link";
import path from "node:path";
import { LearnerProfileEditor } from "@/components/learner-profile-editor";
import { readLearnerProfile } from "@/lib/learner-profile";
import { findRepoRoot } from "@/lib/workspace-data";
import styles from "./profile.module.css";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const learnerPath = path.join(findRepoRoot(), ".learning", "LEARNER.md");
  const profile = readLearnerProfile(learnerPath);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Durable learner context</span>
          <h1>Learner Profile</h1>
          <p>
            Keep only context that should improve teaching across sessions. This is not a transcript and it is not mastery state.
          </p>
        </div>
        <Link href="/">Back to Today</Link>
      </header>

      <LearnerProfileEditor initialProfile={profile} />

      <aside className={styles.boundary}>
        <strong>What belongs here?</strong>
        <p>
          Stable preferences, prior exposure, self-reported strengths or weaknesses, recurring constraints, source context,
          language, pace, and technical background. One-off mistakes and temporary concept state belong elsewhere.
        </p>
      </aside>
    </main>
  );
}
