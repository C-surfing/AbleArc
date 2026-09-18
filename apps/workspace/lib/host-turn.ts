import type { TeachingAdvance } from "./learning-orchestrator";

export const HOST_CAPABILITIES = [
  "read_attachment",
  "retrieve_source",
  "execute_code",
  "render_diagram",
  "edit_file",
] as const;

export type HostCapability = typeof HOST_CAPABILITIES[number];
export type HostReferenceKind = "text" | "file" | "url" | "code";

export interface HostReference {
  id: string;
  kind: HostReferenceKind;
  label?: string;
  locator?: string;
  excerpt?: string;
  mediaType?: string;
}

export interface LearnerSelfReport {
  priorKnowledge?: string;
  uncertainty?: string;
  desiredRigor?: "light" | "standard" | "rigorous";
  intent?: "explain" | "practice" | "debug" | "review" | "explore";
  constraints?: string[];
}

export interface HostTurnInput {
  schemaVersion: "0.1";
  host: {
    id: string;
    conversationId?: string;
  };
  message: string;
  projectId?: string;
  missionId?: string;
  references: HostReference[];
  selfReport?: LearnerSelfReport;
  capabilities: HostCapability[];
  presentation?: {
    language?: string;
    maxChars?: number;
  };
}

export interface HostTurnOutput {
  schemaVersion: "0.1";
  presentation: {
    message: string;
    referencesUsed: string[];
    requestedCapability?: HostCapability;
  };
  control: {
    advance?: TeachingAdvance;
  };
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LOCAL_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  const accepted = new Set(allowed);
  const unsupported = Object.keys(value).filter((key) => !accepted.has(key));
  if (unsupported.length) {
    throw new Error(`${label} contains unsupported fields: ${unsupported.join(", ")}.`);
  }
}

function optionalText(value: unknown, label: string, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`${label} must be a non-empty string of at most ${maximum} characters.`);
  }
  return value.trim();
}

function requiredText(value: unknown, label: string, maximum: number): string {
  const result = optionalText(value, label, maximum);
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function localId(value: unknown, label: string): string | undefined {
  const text = optionalText(value, label, 64);
  if (text === undefined) return undefined;
  if (!LOCAL_ID.test(text)) throw new Error(`${label} is invalid.`);
  return text;
}

function parseReference(value: unknown, index: number): HostReference {
  const item = record(value, `references[${index}]`);
  exactKeys(item, ["id", "kind", "label", "locator", "excerpt", "mediaType"], `references[${index}]`);
  const id = requiredText(item.id, `references[${index}].id`, 128);
  if (!ID.test(id)) throw new Error(`references[${index}].id is invalid.`);
  const kind = item.kind;
  if (kind !== "text" && kind !== "file" && kind !== "url" && kind !== "code") {
    throw new Error(`references[${index}].kind is invalid.`);
  }
  const reference: HostReference = {
    id,
    kind,
    ...(optionalText(item.label, `references[${index}].label`, 240) ? {
      label: optionalText(item.label, `references[${index}].label`, 240),
    } : {}),
    ...(optionalText(item.locator, `references[${index}].locator`, 2000) ? {
      locator: optionalText(item.locator, `references[${index}].locator`, 2000),
    } : {}),
    ...(optionalText(item.excerpt, `references[${index}].excerpt`, 12000) ? {
      excerpt: optionalText(item.excerpt, `references[${index}].excerpt`, 12000),
    } : {}),
    ...(optionalText(item.mediaType, `references[${index}].mediaType`, 120) ? {
      mediaType: optionalText(item.mediaType, `references[${index}].mediaType`, 120),
    } : {}),
  };
  if (!reference.locator && !reference.excerpt) {
    throw new Error(`references[${index}] requires locator or excerpt.`);
  }
  return reference;
}

function parseSelfReport(value: unknown): LearnerSelfReport | undefined {
  if (value === undefined) return undefined;
  const item = record(value, "selfReport");
  exactKeys(
    item,
    ["priorKnowledge", "uncertainty", "desiredRigor", "intent", "constraints"],
    "selfReport",
  );
  const desiredRigor = item.desiredRigor;
  if (
    desiredRigor !== undefined
    && desiredRigor !== "light"
    && desiredRigor !== "standard"
    && desiredRigor !== "rigorous"
  ) throw new Error("selfReport.desiredRigor is invalid.");
  const intent = item.intent;
  if (
    intent !== undefined
    && intent !== "explain"
    && intent !== "practice"
    && intent !== "debug"
    && intent !== "review"
    && intent !== "explore"
  ) throw new Error("selfReport.intent is invalid.");
  let constraints: string[] | undefined;
  if (item.constraints !== undefined) {
    if (!Array.isArray(item.constraints) || item.constraints.length > 12) {
      throw new Error("selfReport.constraints must be a short array.");
    }
    constraints = item.constraints.map((constraint, index) =>
      requiredText(constraint, `selfReport.constraints[${index}]`, 500)
    );
  }
  return {
    ...(optionalText(item.priorKnowledge, "selfReport.priorKnowledge", 2400)
      ? { priorKnowledge: optionalText(item.priorKnowledge, "selfReport.priorKnowledge", 2400) }
      : {}),
    ...(optionalText(item.uncertainty, "selfReport.uncertainty", 2400)
      ? { uncertainty: optionalText(item.uncertainty, "selfReport.uncertainty", 2400) }
      : {}),
    ...(desiredRigor ? { desiredRigor } : {}),
    ...(intent ? { intent } : {}),
    ...(constraints ? { constraints } : {}),
  } as LearnerSelfReport;
}

export function parseHostTurnInput(value: unknown): HostTurnInput {
  const root = record(value, "Host turn");
  exactKeys(
    root,
    [
      "schemaVersion",
      "host",
      "message",
      "projectId",
      "missionId",
      "references",
      "selfReport",
      "capabilities",
      "presentation",
    ],
    "Host turn",
  );
  if (root.schemaVersion !== "0.1") throw new Error("Unsupported Host turn schema.");

  const host = record(root.host, "host");
  exactKeys(host, ["id", "conversationId"], "host");
  const hostId = requiredText(host.id, "host.id", 128);
  if (!ID.test(hostId)) throw new Error("host.id is invalid.");
  const conversationId = optionalText(host.conversationId, "host.conversationId", 256);

  if (!Array.isArray(root.references) || root.references.length > 20) {
    throw new Error("references must be an array of at most 20 items.");
  }
  const references = root.references.map(parseReference);
  if (new Set(references.map((item) => item.id)).size !== references.length) {
    throw new Error("reference ids must be unique.");
  }

  if (!Array.isArray(root.capabilities) || root.capabilities.length > HOST_CAPABILITIES.length) {
    throw new Error("capabilities must be a short array.");
  }
  const capabilities = root.capabilities.map((value, index) => {
    if (typeof value !== "string" || !HOST_CAPABILITIES.includes(value as HostCapability)) {
      throw new Error(`capabilities[${index}] is invalid.`);
    }
    return value as HostCapability;
  });
  if (new Set(capabilities).size !== capabilities.length) {
    throw new Error("capabilities must not contain duplicates.");
  }

  let presentation: HostTurnInput["presentation"];
  if (root.presentation !== undefined) {
    const item = record(root.presentation, "presentation");
    exactKeys(item, ["language", "maxChars"], "presentation");
    const language = optionalText(item.language, "presentation.language", 64);
    const maxChars = item.maxChars;
    if (
      maxChars !== undefined
      && (!Number.isInteger(maxChars) || Number(maxChars) < 200 || Number(maxChars) > 12000)
    ) throw new Error("presentation.maxChars must be an integer from 200 to 12000.");
    presentation = {
      ...(language ? { language } : {}),
      ...(maxChars !== undefined ? { maxChars: Number(maxChars) } : {}),
    };
  }

  return {
    schemaVersion: "0.1",
    host: { id: hostId, ...(conversationId ? { conversationId } : {}) },
    message: requiredText(root.message, "message", 12000),
    ...(localId(root.projectId, "projectId") ? { projectId: localId(root.projectId, "projectId") } : {}),
    ...(localId(root.missionId, "missionId") ? { missionId: localId(root.missionId, "missionId") } : {}),
    references,
    ...(parseSelfReport(root.selfReport) ? { selfReport: parseSelfReport(root.selfReport) } : {}),
    capabilities,
    ...(presentation ? { presentation } : {}),
  };
}

export function createHostTurnOutput(
  message: string,
  control: HostTurnOutput["control"] = {},
  options: {
    referencesUsed?: string[];
    requestedCapability?: HostCapability;
  } = {},
): HostTurnOutput {
  const presentationMessage = requiredText(message, "presentation.message", 12000);
  const referencesUsed = options.referencesUsed ?? [];
  if (
    referencesUsed.length > 20
    || referencesUsed.some((id) => typeof id !== "string" || !ID.test(id))
    || new Set(referencesUsed).size !== referencesUsed.length
  ) throw new Error("presentation.referencesUsed is invalid.");
  if (
    options.requestedCapability !== undefined
    && !HOST_CAPABILITIES.includes(options.requestedCapability)
  ) throw new Error("presentation.requestedCapability is invalid.");
  return {
    schemaVersion: "0.1",
    presentation: {
      message: presentationMessage,
      referencesUsed,
      ...(options.requestedCapability ? { requestedCapability: options.requestedCapability } : {}),
    },
    control,
  };
}
