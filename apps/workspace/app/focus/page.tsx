import { redirect } from "next/navigation";
import { FocusSession } from "@/components/focus-session";
import { readDailyContext } from "@/lib/daily-context-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default function FocusPage() {
  const snapshot = loadWorkspaceSnapshot();
  if (!snapshot.hasMission || !snapshot.projectId) redirect("/");
  const dailyContext = readDailyContext(findRepoRoot());
  return <FocusSession snapshot={snapshot} dailyContext={dailyContext} />;
}
