import { LearningHome } from "@/components/learning-home";
import { readDailyContext } from "@/lib/daily-context-store";
import { relevantTomorrowSeed } from "@/lib/session-close";
import { readSessionClose } from "@/lib/session-close-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const repoRoot = findRepoRoot();
  const snapshot = loadWorkspaceSnapshot();
  const dailyContext = readDailyContext(repoRoot);
  let tomorrowSeed;
  if (snapshot.projectId && snapshot.missionId) {
    try {
      tomorrowSeed = relevantTomorrowSeed(readSessionClose(repoRoot), snapshot);
    } catch {
      tomorrowSeed = undefined;
    }
  }
  return (
    <LearningHome
      snapshot={snapshot}
      dailyContext={dailyContext}
      tomorrowSeed={tomorrowSeed}
    />
  );
}
