import { LearningHome } from "@/components/learning-home";
import { ProviderSetup } from "@/components/provider-setup";
import { readDailyContext } from "@/lib/daily-context-store";
import { providerSettingsMetadata } from "@/lib/provider-settings";
import { relevantTomorrowSeed } from "@/lib/session-close";
import { readSessionClose } from "@/lib/session-close-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";
import { getWorkspaceProviderStatus } from "@/lib/workspace-provider";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const repoRoot = findRepoRoot();
  const providerSettings = providerSettingsMetadata(repoRoot);
  const providerStatus = getWorkspaceProviderStatus(repoRoot);
  if (!providerStatus.configured) {
    return (
      <ProviderSetup
        initial={{ ...providerSettings, configured: false }}
        mode="onboarding"
      />
    );
  }
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
