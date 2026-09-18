import type { WorkspaceSnapshot } from "./types.ts";

export interface ReflectionLinks {
  missionId?: string;
  decisionId?: string;
  conceptIds: string[];
  materialIds: string[];
}

export interface ReflectionRecord {
  schemaVersion: "0.1";
  id: string;
  workspaceId: string;
  projectId: string;
  revision: number;
  body: string;
  links: ReflectionLinks;
  createdAt: string;
  updatedAt: string;
}

export type ReflectionContextMode = "preserve" | "current" | "none";

export function currentReflectionLinks(
  snapshot: WorkspaceSnapshot,
  materialIds: string[],
): ReflectionLinks {
  return {
    ...(snapshot.missionId ? { missionId: snapshot.missionId } : {}),
    ...(
      snapshot.latestExchange?.decisionId
        ? { decisionId: snapshot.latestExchange.decisionId }
        : snapshot.decision?.id
          ? { decisionId: snapshot.decision.id }
          : {}
    ),
    conceptIds: [...snapshot.map.frontier],
    materialIds: [...materialIds],
  };
}

export const REFLECTION_AUTHORITY = {
  createEvidence: false,
  changeMastery: false,
  reviseMap: false,
  completeMission: false,
} as const;
