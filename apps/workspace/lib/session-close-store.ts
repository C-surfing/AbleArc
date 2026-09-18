import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson, withExclusiveFileLock } from "./local-file-store.ts";
import { resolveProjectReadContext } from "./project-store.ts";
import type {
  SessionCapabilityChange,
  SessionCloseDraft,
  SessionCloseMaterial,
  SessionCloseRecord,
  SessionCloseUncertainty,
  TomorrowSeed,
} from "./session-close.ts";

const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const WORKSPACE_ID = /^ws_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const MATERIAL_ID = /^mat_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;

function text(value: unknown, label: string, maximum = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new Error("Session Close " + label + " is invalid");
  }
  return value.trim();
}

function currentContext(repoRoot: string) {
  const context = resolveProjectReadContext(repoRoot);
  if (
    !context
    || context.layout !== "workspace-v0.2"
    || !context.workspaceId
    || !context.missionId
    || !WORKSPACE_ID.test(context.workspaceId)
    || !LOCAL_ID.test(context.projectId)
    || !LOCAL_ID.test(context.missionId)
  ) {
    throw new Error("Session Close requires an active workspace-v0.2 Project and Mission");
  }
  return context;
}

export function sessionCloseFilePath(repoRoot: string): string {
  const context = currentContext(repoRoot);
  return path.join(
    path.dirname(context.runtimeRoot),
    "continuity",
    context.missionId!,
    "session-close.json",
  );
}

function parseCapability(value: unknown): SessionCapabilityChange | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Session Close capability_change is invalid");
  }
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length !== 3) throw new Error("Session Close capability_change is invalid");
  const states = new Set(["unknown", "exposed", "developing", "stable", "transferable"]);
  if (!states.has(String(item.before)) || !states.has(String(item.after))) {
    throw new Error("Session Close capability_change state is invalid");
  }
  return {
    concept: text(item.concept, "capability concept", 200),
    before: item.before as SessionCapabilityChange["before"],
    after: item.after as SessionCapabilityChange["after"],
  };
}

function parseUnresolved(value: unknown): SessionCloseUncertainty | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Session Close unresolved state is invalid");
  }
  const item = value as Record<string, unknown>;
  if (!["low", "medium", "high"].includes(String(item.uncertainty))) {
    throw new Error("Session Close uncertainty is invalid");
  }
  return {
    target: text(item.target, "unresolved target", 400),
    uncertainty: item.uncertainty as SessionCloseUncertainty["uncertainty"],
    rationale: text(item.rationale, "unresolved rationale", 2000),
  };
}

function parseMaterials(value: unknown): SessionCloseMaterial[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error("Session Close materials are invalid");
  }
  return value.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Session Close material is invalid");
    }
    const item = raw as Record<string, unknown>;
    const id = text(item.id, "material id", 131);
    if (!MATERIAL_ID.test(id)) throw new Error("Session Close material id is invalid");
    return { id, title: text(item.title, "material title", 200) };
  });
}

function parseSeed(value: unknown): TomorrowSeed | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Session Close Tomorrow Seed is invalid");
  }
  const item = value as Record<string, unknown>;
  const decisionId = text(item.decision_id, "Tomorrow Seed decision", 131);
  if (!decisionId.startsWith("dec_")) {
    throw new Error("Session Close Tomorrow Seed decision is invalid");
  }
  return {
    decisionId,
    target: text(item.target, "Tomorrow Seed target", 400),
    action: text(item.action, "Tomorrow Seed action", 2000),
  };
}

function parseManifest(input: unknown, expected: ReturnType<typeof currentContext>): SessionCloseRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Session Close manifest must be an object");
  }
  const value = input as Record<string, unknown>;
  const revision = Number(value.revision);
  const pendingProposalCount = Number(value.pending_proposal_count);
  if (
    value.schema_version !== "0.1"
    || value.kind !== "session-close"
    || value.workspace_id !== expected.workspaceId
    || value.project_id !== expected.projectId
    || value.mission_id !== expected.missionId
    || !Number.isSafeInteger(revision)
    || revision < 1
    || !Number.isSafeInteger(pendingProposalCount)
    || pendingProposalCount < 0
    || typeof value.closed_at !== "string"
    || Number.isNaN(Date.parse(value.closed_at))
  ) {
    throw new Error("Session Close manifest scope or revision is invalid");
  }
  const sourceDecisionId = text(value.source_decision_id, "source decision", 131);
  const sourceObservationId = text(value.source_observation_id, "source observation", 131);
  const sourceEvidenceId = text(value.source_evidence_id, "source evidence", 131);
  if (
    !sourceDecisionId.startsWith("dec_")
    || !sourceObservationId.startsWith("obs_")
    || !sourceEvidenceId.startsWith("ev_")
  ) {
    throw new Error("Session Close Runtime references are invalid");
  }

  const capabilityChange = parseCapability(value.capability_change);
  const unresolved = parseUnresolved(value.unresolved);
  const tomorrowSeed = parseSeed(value.tomorrow_seed);
  return {
    schemaVersion: "0.1",
    revision,
    workspaceId: expected.workspaceId!,
    projectId: expected.projectId,
    missionId: expected.missionId!,
    closedAt: value.closed_at,
    sourceDecisionId,
    sourceObservationId,
    sourceEvidenceId,
    evidenceSummary: text(value.evidence_summary, "evidence summary", 4000),
    ...(capabilityChange ? { capabilityChange } : {}),
    ...(unresolved ? { unresolved } : {}),
    materials: parseMaterials(value.materials),
    pendingProposalCount,
    ...(tomorrowSeed ? { tomorrowSeed } : {}),
  };
}

export function readSessionClose(repoRoot: string): SessionCloseRecord | undefined {
  const context = currentContext(repoRoot);
  const filePath = path.join(
    path.dirname(context.runtimeRoot),
    "continuity",
    context.missionId!,
    "session-close.json",
  );
  if (!fs.existsSync(filePath)) return undefined;
  if (fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error("Session Close manifest must not be a symbolic link");
  }
  try {
    return parseManifest(JSON.parse(fs.readFileSync(filePath, "utf8")), context);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Session Close")) throw error;
    throw new Error("Session Close manifest is not valid JSON");
  }
}

export function writeSessionClose(
  repoRoot: string,
  draft: SessionCloseDraft,
  expectedRevision: number,
): SessionCloseRecord {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error("Session Close expected revision is invalid");
  }
  const context = currentContext(repoRoot);
  const projectRoot = path.dirname(context.runtimeRoot);
  return withExclusiveFileLock(
    path.join(projectRoot, ".session-close.lock"),
    "another Session Close write is already in progress",
    () => {
      const current = readSessionClose(repoRoot);
      const revision = current?.revision ?? 0;
      if (revision !== expectedRevision) {
        throw new Error("Session Close changed before this update was saved");
      }

      const record: SessionCloseRecord = {
        schemaVersion: "0.1",
        revision: revision + 1,
        workspaceId: context.workspaceId!,
        projectId: context.projectId,
        missionId: context.missionId!,
        closedAt: new Date().toISOString(),
        ...draft,
      };

      const target = path.join(
        projectRoot,
        "continuity",
        context.missionId!,
        "session-close.json",
      );
      atomicWriteJson(
        target,
        {
          schema_version: record.schemaVersion,
          kind: "session-close",
          workspace_id: record.workspaceId,
          project_id: record.projectId,
          mission_id: record.missionId,
          revision: record.revision,
          closed_at: record.closedAt,
          source_decision_id: record.sourceDecisionId,
          source_observation_id: record.sourceObservationId,
          source_evidence_id: record.sourceEvidenceId,
          evidence_summary: record.evidenceSummary,
          ...(record.capabilityChange ? {
            capability_change: {
              concept: record.capabilityChange.concept,
              before: record.capabilityChange.before,
              after: record.capabilityChange.after,
            },
          } : {}),
          ...(record.unresolved ? {
            unresolved: {
              target: record.unresolved.target,
              uncertainty: record.unresolved.uncertainty,
              rationale: record.unresolved.rationale,
            },
          } : {}),
          materials: record.materials,
          pending_proposal_count: record.pendingProposalCount,
          ...(record.tomorrowSeed ? {
            tomorrow_seed: {
              decision_id: record.tomorrowSeed.decisionId,
              target: record.tomorrowSeed.target,
              action: record.tomorrowSeed.action,
            },
          } : {}),
        },
        {
          directoryLabel: "Session Close directory",
          targetLabel: "Session Close manifest",
          temporaryPrefix: ".session-close",
        },
      );
      return record;
    },
  );
}
