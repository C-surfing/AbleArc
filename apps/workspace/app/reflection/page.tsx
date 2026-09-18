import { redirect } from "next/navigation";
import { ReflectionStudio } from "@/components/reflection-studio";
import { listReflections } from "@/lib/reflection-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default function ReflectionPage() {
  const repoRoot = findRepoRoot();
  const snapshot = loadWorkspaceSnapshot();
  if (!snapshot.projectId || !snapshot.hasMission) redirect("/");

  const reflections = listReflections(repoRoot);
  return (
    <ReflectionStudio
      projectId={snapshot.projectId}
      projectTitle={snapshot.projectTitle || "Current Project"}
      missionId={snapshot.missionId}
      currentDecisionId={snapshot.latestExchange?.decisionId || snapshot.decision?.id}
      currentConceptIds={snapshot.map.frontier}
      materials={snapshot.materials.map((item) => ({ id: item.id, title: item.title }))}
      initialReflections={reflections}
    />
  );
}
