import fs from "node:fs";
import path from "node:path";

export interface LearnerProfile {
  revision: number;
  updatedAt?: string;
  preferredLanguage?: string;
  detailLevel?: string;
  intuitionFormalism?: string;
  socraticTolerance?: string;
  preferredPace?: string;
  priorExposure?: string;
  reportedStrengths?: string;
  reportedWeaknesses?: string;
  longTermGoals?: string;
  sourceContext?: string;
  technicalBackground?: string;
  toolsAndLanguages?: string;
  typicalSessionLength?: string;
  recurringConstraints?: string;
}

export type LearnerProfilePatch = Omit<LearnerProfile, "revision" | "updatedAt">;

const FIELD_LABELS: Record<keyof LearnerProfilePatch, string> = {
  preferredLanguage: "Preferred language",
  detailLevel: "Desired level of detail",
  intuitionFormalism: "Preferred balance of intuition / formalism",
  socraticTolerance: "Socratic tolerance",
  preferredPace: "Preferred pace",
  priorExposure: "Relevant prior knowledge",
  reportedStrengths: "Self-reported strengths",
  reportedWeaknesses: "Self-reported weaknesses",
  longTermGoals: "Long-term learning goals",
  sourceContext: "Courses / source context",
  technicalBackground: "Programming / technical background",
  toolsAndLanguages: "Tools / programming languages",
  typicalSessionLength: "Typical study session length",
  recurringConstraints: "Recurring learning constraints",
};

const REVISION = /<!--\s*profile_revision:\s*(\d+)\s*-->/i;
const UPDATED_AT = /<!--\s*profile_updated_at:\s*([^>]+?)\s*-->/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function valueForLabel(markdown: string, label: string): string | undefined {
  const escaped = escapeRegExp(label);
  const match = markdown.match(new RegExp("^-\\s*" + escaped + ":\\s*(.*)$", "im"));
  const value = match?.[1]?.trim();
  return value || undefined;
}

function normalizeValue(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(label + " must be a string.");
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > 1200) throw new Error(label + " must be at most 1200 characters.");
  if (/\r|\n/.test(normalized)) throw new Error(label + " must be a single line.");
  return normalized;
}

export function parseLearnerProfile(markdown: string): LearnerProfile {
  const revisionMatch = markdown.match(REVISION);
  const updatedMatch = markdown.match(UPDATED_AT);
  const profile: LearnerProfile = {
    revision: revisionMatch ? Number(revisionMatch[1]) : 0,
    ...(updatedMatch?.[1]?.trim() ? { updatedAt: updatedMatch[1].trim() } : {}),
  };
  for (const [key, label] of Object.entries(FIELD_LABELS) as Array<[keyof LearnerProfilePatch, string]>) {
    const value = valueForLabel(markdown, label);
    if (value) profile[key] = value;
  }
  return profile;
}

function replaceOrAppendField(markdown: string, label: string, value: string | undefined): string {
  const escaped = escapeRegExp(label);
  const pattern = new RegExp("^-\\s*" + escaped + ":.*$", "im");
  const line = "- " + label + ": " + (value ?? "");
  if (pattern.test(markdown)) return markdown.replace(pattern, line);

  const marker = "## Learner Profile v1 additions";
  if (!markdown.includes(marker)) {
    markdown = markdown.trimEnd() + "\n\n" + marker + "\n\n";
  }
  const insertion = markdown.indexOf(marker) + marker.length;
  const before = markdown.slice(0, insertion);
  const after = markdown.slice(insertion);
  return before + "\n" + line + after;
}

export function updateLearnerProfileMarkdown(
  markdown: string,
  patch: LearnerProfilePatch,
  expectedRevision: number,
  now = new Date().toISOString(),
): { markdown: string; profile: LearnerProfile } {
  const current = parseLearnerProfile(markdown);
  if (current.revision !== expectedRevision) {
    throw new Error("Learner Profile changed. Refresh before saving.");
  }

  let next = markdown;
  for (const [key, label] of Object.entries(FIELD_LABELS) as Array<[keyof LearnerProfilePatch, string]>) {
    const value = normalizeValue(patch[key], label);
    next = replaceOrAppendField(next, label, value);
  }

  const revision = current.revision + 1;
  if (REVISION.test(next)) next = next.replace(REVISION, "<!-- profile_revision: " + revision + " -->");
  else next = "<!-- profile_revision: " + revision + " -->\n" + next;
  if (UPDATED_AT.test(next)) next = next.replace(UPDATED_AT, "<!-- profile_updated_at: " + now + " -->");
  else next = next.replace(
    /^(<!-- profile_revision:[^\n]+-->\n)/,
    "$1<!-- profile_updated_at: " + now + " -->\n",
  );

  return { markdown: next, profile: parseLearnerProfile(next) };
}

export function readLearnerProfile(learnerPath: string): LearnerProfile {
  if (!fs.existsSync(learnerPath)) return { revision: 0 };
  if (fs.lstatSync(learnerPath).isSymbolicLink()) {
    throw new Error("Learner Profile must not be a symbolic link.");
  }
  return parseLearnerProfile(fs.readFileSync(learnerPath, "utf8"));
}

export function writeLearnerProfile(
  learnerPath: string,
  patch: LearnerProfilePatch,
  expectedRevision: number,
): LearnerProfile {
  const resolved = path.resolve(learnerPath);
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) {
    throw new Error("Learner Profile must not be a symbolic link.");
  }
  const current = fs.existsSync(resolved)
    ? fs.readFileSync(resolved, "utf8")
    : "# Learner Model — Durable Profile\n";
  const updated = updateLearnerProfileMarkdown(current, patch, expectedRevision);
  const temporary = resolved + "." + process.pid + ".tmp";
  fs.writeFileSync(temporary, updated.markdown, "utf8");
  fs.renameSync(temporary, resolved);
  return updated.profile;
}
