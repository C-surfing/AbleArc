import fs from "node:fs";
import path from "node:path";
import { parseCanonicalLearningMap } from "./learning-map-data.ts";
import { resolveProjectReadContext } from "./project-store.ts";
import type { LearningMapView, MasteryState } from "./types.ts";

const MAX_EVIDENCE_RECEIPTS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

type EvidenceOutcome = "supports" | "contradicts" | "inconclusive";

interface RuntimeEvidenceReceipt {
  id: string;
  kind: "evidence";
  created_at: string;
  concept_ids: string[];
  level: "recognition" | "recall" | "explanation" | "application" | "transfer";
  outcome: EvidenceOutcome;
  scaffolding: "none" | "light" | "heavy";
  context: "same" | "varied" | "novel";
  delay: "immediate" | "delayed";
  independence: "same_form" | "new_form" | "independent";
}

interface RuntimeState {
  concepts?: Record<string, {
    label?: string;
    state?: MasteryState;
  }>;
}

export interface SupportingEvidenceSnapshot {
  id: string;
  createdAt: string;
  level: RuntimeEvidenceReceipt["level"];
  scaffolding: RuntimeEvidenceReceipt["scaffolding"];
  context: RuntimeEvidenceReceipt["context"];
  delay: RuntimeEvidenceReceipt["delay"];
  independence: RuntimeEvidenceReceipt["independence"];
}

export interface EvidenceFreshnessFact {
  conceptId: string;
  label: string;
  state: MasteryState;
  missionRelevance: "core" | "supporting" | "optional";
  isFrontier: boolean;
  prerequisiteToFrontier: boolean;
  supportingEvidenceCount: number;
  contradictingEvidenceCount: number;
  latestEvidenceAt?: string;
  latestSupporting?: SupportingEvidenceSnapshot;
  daysSinceLatestSupporting?: number;
  hasDelayedSupporting: boolean;
  hasIndependentSupporting: boolean;
  hasTransferSupporting: boolean;
}

export interface ReviewPolicyContext {
  observedAt: string;
  concepts: EvidenceFreshnessFact[];
}

function safeJson(filePath: string): unknown | undefined {
  try {
    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isSymbolicLink()) return undefined;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function evidenceReceipts(runtimeRoot: string): RuntimeEvidenceReceipt[] {
  const root = path.join(runtimeRoot, "receipts", "evidence");
  try {
    if (!fs.existsSync(root) || fs.lstatSync(root).isSymbolicLink()) return [];
    const entries = fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
    if (entries.length > MAX_EVIDENCE_RECEIPTS) return [];
    return entries.flatMap((entry) => {
      const value = safeJson(path.join(root, entry.name));
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const receipt = value as Record<string, unknown>;
      if (
        receipt.kind !== "evidence"
        || typeof receipt.id !== "string"
        || typeof receipt.created_at !== "string"
        || !Array.isArray(receipt.concept_ids)
      ) return [];
      return [{
        id: receipt.id,
        kind: "evidence" as const,
        created_at: receipt.created_at,
        concept_ids: receipt.concept_ids.map(String),
        level: (["recognition", "recall", "explanation", "application", "transfer"].includes(String(receipt.level))
          ? receipt.level
          : "recognition") as RuntimeEvidenceReceipt["level"],
        outcome: (["supports", "contradicts", "inconclusive"].includes(String(receipt.outcome))
          ? receipt.outcome
          : "inconclusive") as EvidenceOutcome,
        scaffolding: (["none", "light", "heavy"].includes(String(receipt.scaffolding))
          ? receipt.scaffolding
          : "heavy") as RuntimeEvidenceReceipt["scaffolding"],
        context: (["same", "varied", "novel"].includes(String(receipt.context))
          ? receipt.context
          : "same") as RuntimeEvidenceReceipt["context"],
        delay: receipt.delay === "delayed" ? "delayed" : "immediate",
        independence: (["same_form", "new_form", "independent"].includes(String(receipt.independence))
          ? receipt.independence
          : "same_form") as RuntimeEvidenceReceipt["independence"],
      }];
    }).sort((left, right) => left.created_at.localeCompare(right.created_at));
  } catch {
    return [];
  }
}

function canonicalMap(filePath: string | undefined, projectId: string): LearningMapView | undefined {
  if (!filePath) return undefined;
  const value = safeJson(filePath);
  if (!value) return undefined;
  try {
    return parseCanonicalLearningMap(value, projectId);
  } catch {
    return undefined;
  }
}

function runtimeState(runtimeRoot: string): RuntimeState {
  const value = safeJson(path.join(runtimeRoot, "state.json"));
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as RuntimeState;
}

function mastery(value: unknown): MasteryState {
  return ["unknown", "exposed", "developing", "stable", "transferable"].includes(String(value))
    ? value as MasteryState
    : "unknown";
}

function latest<T extends { created_at: string }>(items: T[]): T | undefined {
  return items.at(-1);
}

function daysSince(now: Date, timestamp: string | undefined): number | undefined {
  if (!timestamp) return undefined;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / DAY_MS));
}

export function deriveEvidenceFreshness(
  map: LearningMapView | undefined,
  state: RuntimeState,
  evidence: RuntimeEvidenceReceipt[],
  now: Date,
): ReviewPolicyContext | undefined {
  const ids = new Set<string>();
  for (const node of map?.nodes || []) ids.add(node.id);
  for (const id of Object.keys(state.concepts || {})) ids.add(id);
  for (const receipt of evidence) for (const id of receipt.concept_ids) ids.add(id);
  if (ids.size === 0 || evidence.length === 0) return undefined;

  const nodeById = new Map((map?.nodes || []).map((node) => [node.id, node]));
  const frontier = new Set(map?.frontier || []);
  const prerequisiteToFrontier = new Set(
    (map?.edges || [])
      .filter((edge) => edge.relation === "prerequisite" && frontier.has(edge.target))
      .map((edge) => edge.source),
  );

  const concepts = [...ids].flatMap((conceptId): EvidenceFreshnessFact[] => {
    const history = evidence.filter((item) => item.concept_ids.includes(conceptId));
    if (history.length === 0) return [];
    const supporting = history.filter((item) => item.outcome === "supports");
    const node = nodeById.get(conceptId);
    const projected = state.concepts?.[conceptId];
    const last = latest(history);
    const lastSupporting = latest(supporting);

    return [{
      conceptId,
      label: node?.label || projected?.label || conceptId,
      state: mastery(projected?.state || node?.state),
      missionRelevance: node?.missionRelevance || "supporting",
      isFrontier: frontier.has(conceptId),
      prerequisiteToFrontier: prerequisiteToFrontier.has(conceptId),
      supportingEvidenceCount: supporting.length,
      contradictingEvidenceCount: history.filter((item) => item.outcome === "contradicts").length,
      latestEvidenceAt: last?.created_at,
      latestSupporting: lastSupporting ? {
        id: lastSupporting.id,
        createdAt: lastSupporting.created_at,
        level: lastSupporting.level,
        scaffolding: lastSupporting.scaffolding,
        context: lastSupporting.context,
        delay: lastSupporting.delay,
        independence: lastSupporting.independence,
      } : undefined,
      daysSinceLatestSupporting: daysSince(now, lastSupporting?.created_at),
      hasDelayedSupporting: supporting.some((item) => item.delay === "delayed"),
      hasIndependentSupporting: supporting.some((item) => item.independence === "independent"),
      hasTransferSupporting: supporting.some((item) => item.level === "transfer" && item.context === "novel"),
    }];
  });

  if (concepts.length === 0) return undefined;

  concepts.sort((left, right) => {
    const importance = (item: EvidenceFreshnessFact) =>
      Number(item.isFrontier) * 8
      + Number(item.prerequisiteToFrontier) * 4
      + (item.missionRelevance === "core" ? 2 : item.missionRelevance === "supporting" ? 1 : 0);
    return importance(right) - importance(left)
      || (right.daysSinceLatestSupporting ?? -1) - (left.daysSinceLatestSupporting ?? -1)
      || left.conceptId.localeCompare(right.conceptId);
  });

  return {
    observedAt: now.toISOString(),
    concepts: concepts.slice(0, 30),
  };
}

export function readReviewPolicyContext(
  repoRoot: string,
  now: Date = new Date(),
): ReviewPolicyContext | undefined {
  const context = resolveProjectReadContext(repoRoot);
  if (!context) return undefined;
  return deriveEvidenceFreshness(
    canonicalMap(context.learningMapPath, context.projectId),
    runtimeState(context.runtimeRoot),
    evidenceReceipts(context.runtimeRoot),
    now,
  );
}
