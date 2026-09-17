import { LearningHome } from "@/components/learning-home";
import { loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const snapshot = loadWorkspaceSnapshot();
  return <LearningHome snapshot={snapshot} />;
}
