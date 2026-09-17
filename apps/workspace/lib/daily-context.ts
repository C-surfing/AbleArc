export type ContextScale = 1 | 2 | 3 | 4 | 5;

export interface DailyContext {
  schemaVersion: "0.1";
  revision: number;
  energy: ContextScale;
  availableMinutes?: number;
  focus?: ContextScale;
  note?: string;
  updatedAt: string;
}

export interface DailyContextUpdate {
  expectedRevision: number;
  energy: ContextScale;
  availableMinutes?: number;
  focus?: ContextScale;
  note?: string;
}

const MAX_AVAILABLE_MINUTES = 12 * 60;
const MAX_NOTE_LENGTH = 500;

export function isContextScale(value: unknown): value is ContextScale {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

export function normalizeDailyContextUpdate(input: unknown): DailyContextUpdate {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("DailyContext update must be an object");
  }
  const value = input as Record<string, unknown>;
  const allowed = new Set(["expectedRevision", "energy", "availableMinutes", "focus", "note"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error("DailyContext update contains unsupported fields");
  }
  if (!Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0) {
    throw new Error("DailyContext expected revision is invalid");
  }
  if (!isContextScale(value.energy)) {
    throw new Error("DailyContext energy must be an integer from 1 to 5");
  }

  let availableMinutes: number | undefined;
  if (value.availableMinutes !== undefined && value.availableMinutes !== null && value.availableMinutes !== "") {
    if (
      !Number.isSafeInteger(value.availableMinutes)
      || Number(value.availableMinutes) < 1
      || Number(value.availableMinutes) > MAX_AVAILABLE_MINUTES
    ) {
      throw new Error(`DailyContext availableMinutes must be an integer from 1 to ${MAX_AVAILABLE_MINUTES}`);
    }
    availableMinutes = Number(value.availableMinutes);
  }

  let focus: ContextScale | undefined;
  if (value.focus !== undefined && value.focus !== null && value.focus !== "") {
    if (!isContextScale(value.focus)) {
      throw new Error("DailyContext focus must be an integer from 1 to 5");
    }
    focus = value.focus;
  }

  let note: string | undefined;
  if (value.note !== undefined && value.note !== null) {
    if (typeof value.note !== "string") throw new Error("DailyContext note must be text");
    const normalized = value.note.trim();
    if (normalized.length > MAX_NOTE_LENGTH) {
      throw new Error(`DailyContext note cannot exceed ${MAX_NOTE_LENGTH} characters`);
    }
    note = normalized || undefined;
  }

  return {
    expectedRevision: Number(value.expectedRevision),
    energy: value.energy,
    ...(availableMinutes ? { availableMinutes } : {}),
    ...(focus ? { focus } : {}),
    ...(note ? { note } : {}),
  };
}
