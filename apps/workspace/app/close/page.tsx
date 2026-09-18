import { redirect } from "next/navigation";
import { SessionCloseView } from "@/components/session-close";
import { deriveSessionClose } from "@/lib/session-close";
import { readSessionClose } from "@/lib/session-close-store";
import { findRepoRoot, loadWorkspaceSnapshot } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default function SessionClosePage() {
  const repoRoot = findRepoRoot();
  const snapshot = loadWorkspaceSnapshot();
  if (!snapshot.hasMission || !snapshot.projectId) redirect("/");

  let preview;
  try {
    preview = deriveSessionClose(snapshot);
  } catch {
    redirect("/focus");
  }

  const current = readSessionClose(repoRoot);
  return (
    <SessionCloseView
      projectTitle={snapshot.projectTitle || "Current Project"}
      preview={preview}
      currentRevision={current?.revision ?? 0}
    />
  );
}
