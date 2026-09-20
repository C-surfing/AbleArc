import { notFound } from "next/navigation";
import { FocusSession } from "@/components/focus-session";
import { LearnerProfileEditor } from "@/components/learner-profile-editor";
import { LearningHome } from "@/components/learning-home";
import { PaperStudyStudio } from "@/components/paper-study-studio";
import { ProviderSetup } from "@/components/provider-setup";
import { ReflectionStudio } from "@/components/reflection-studio";
import { SessionCloseView } from "@/components/session-close";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  VISUAL_DAILY_CONTEXT,
  VISUAL_ENTRY_SNAPSHOT,
  VISUAL_PAPER_PLAN,
  VISUAL_PROFILE,
  VISUAL_REFLECTIONS,
  VISUAL_SESSION_CLOSE,
  VISUAL_SNAPSHOT,
  VISUAL_ZH_SNAPSHOT,
} from "@/lib/visual-qa-fixtures";

export const dynamic = "force-dynamic";

const SURFACES = new Set([
  "entry",
  "today",
  "focus",
  "focus-zh",
  "paper",
  "reflection",
  "profile",
  "settings",
  "close",
  "workspace",
]);

export default async function VisualQaSurface({
  params,
}: {
  params: Promise<{ surface: string }>;
}) {
  if (process.env.ABLEARC_VISUAL_QA !== "1") notFound();

  const { surface } = await params;
  if (!SURFACES.has(surface)) notFound();

  if (surface === "entry") {
    return <LearningHome snapshot={VISUAL_ENTRY_SNAPSHOT} />;
  }

  if (surface === "today") {
    return (
      <LearningHome
        snapshot={VISUAL_SNAPSHOT}
        dailyContext={VISUAL_DAILY_CONTEXT}
      />
    );
  }

  if (surface === "focus") {
    return (
      <FocusSession
        snapshot={VISUAL_SNAPSHOT}
        dailyContext={VISUAL_DAILY_CONTEXT}
      />
    );
  }

  if (surface === "focus-zh") {
    return (
      <FocusSession
        snapshot={VISUAL_ZH_SNAPSHOT}
        dailyContext={VISUAL_DAILY_CONTEXT}
      />
    );
  }

  if (surface === "paper") {
    return (
      <main style={{ width: "min(1100px, calc(100% - 40px))", margin: "0 auto", padding: "56px 0 80px" }}>
        <PaperStudyStudio
          projectId="prj_visual_cuda"
          missionId="msn_visual_cuda"
          missionGoal={VISUAL_SNAPSHOT.mission}
          existingPlan={VISUAL_PAPER_PLAN}
          writable
        />
      </main>
    );
  }

  if (surface === "reflection") {
    return (
      <ReflectionStudio
        projectId="prj_visual_cuda"
        projectTitle="CUDA memory hierarchy"
        missionId="msn_visual_cuda"
        currentDecisionId="dec_visual_cache"
        currentConceptIds={["cache-miss", "shared-memory"]}
        materials={VISUAL_SNAPSHOT.materials.map((item) => ({ id: item.id, title: item.title }))}
        initialReflections={VISUAL_REFLECTIONS}
      />
    );
  }

  if (surface === "profile") {
    return (
      <main style={{ width: "min(980px, calc(100% - 40px))", margin: "0 auto", padding: "62px 0 78px" }}>
        <header style={{ marginBottom: 34 }}>
          <span style={{ color: "var(--accent-strong)", fontSize: 10, fontWeight: 780, letterSpacing: ".09em", textTransform: "uppercase" }}>
            Durable learner context
          </span>
          <h1 style={{ margin: "9px 0 10px", fontFamily: "var(--font-display)", fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 540, lineHeight: .98, letterSpacing: "-.058em" }}>
            Learner Profile
          </h1>
          <p style={{ maxWidth: 690, margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            Keep only context that should improve teaching across sessions. This is not a transcript and it is not mastery state.
          </p>
        </header>
        <LearnerProfileEditor initialProfile={VISUAL_PROFILE} />
      </main>
    );
  }

  if (surface === "settings") {
    return (
      <ProviderSetup
        initial={{
          configured: true,
          source: "web",
          model: "gpt-5.6",
          baseUrl: "https://api.openai.com/v1",
          structuredOutput: "json_schema",
          timeoutMs: 120000,
        }}
        mode="onboarding"
      />
    );
  }

  if (surface === "close") {
    return (
      <SessionCloseView
        projectTitle="CUDA memory hierarchy"
        preview={VISUAL_SESSION_CLOSE}
        currentRevision={2}
      />
    );
  }

  return <WorkspaceShell snapshot={VISUAL_SNAPSHOT} />;
}
