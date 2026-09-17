import { LearningHome } from "@/components/learning-home";
import { readDailyContext } from "@/lib/daily-context-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const snapshot = loadWorkspaceSnapshot();
  const dailyContext = readDailyContext(findRepoRoot());
  return <LearningHome snapshot={snapshot} dailyContext={dailyContext} />;
}
