import Link from "next/link";
import { PaperStudyStudio } from "@/components/paper-study-studio";
import { readPaperLearningContext } from "@/lib/paper-session";
import { resolveProjectReadContext } from "@/lib/project-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";
import styles from "./paper.module.css";

export const dynamic = "force-dynamic";

export default function PaperPage() {
  const repoRoot = findRepoRoot();
  const context = resolveProjectReadContext(repoRoot);
  const snapshot = loadWorkspaceSnapshot();

  if (!context || context.layout !== "workspace-v0.2" || !context.missionId) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <span>Paper Learning</span>
            <h1>Start a learning Project first.</h1>
            <p>Paper Learning attaches source-grounded context to the selected Mission rather than creating a separate learning state.</p>
          </div>
          <Link href="/">Back to Today</Link>
        </header>
        <section className={styles.empty}>
          <strong>No active workspace Mission is available.</strong>
          <p>Create or select a Project, then return here to attach the paper and build its learning route.</p>
          <Link href="/">Create or select a Project →</Link>
        </section>
      </main>
    );
  }

  let existingPlan;
  try {
    existingPlan = readPaperLearningContext(context)?.plan;
  } catch {
    existingPlan = undefined;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Paper Learning · {snapshot.projectTitle || context.projectTitle}</span>
          <h1>Study the argument, not the page count.</h1>
          <p>
            {snapshot.mission} The paper plan is source-grounded teaching context; learner capability still comes only from Runtime Evidence.
          </p>
        </div>
        <nav>
          <Link href="/">Today</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/workspace">Workspace</Link>
        </nav>
      </header>

      <PaperStudyStudio
        projectId={context.projectId}
        missionId={context.missionId}
        missionGoal={snapshot.mission}
        existingPlan={existingPlan}
        writable={context.projectStatus === "active"}
      />

      <footer className={styles.boundary}>
        <strong>Authority boundary</strong>
        <span>
          Paper plan: teaching context ✓ · learner Evidence ✕ · mastery ✕ · Map authority ✕ · Completion authority ✕
        </span>
      </footer>
    </main>
  );
}
