import fs from "node:fs";
import path from "node:path";

export type ProviderStructuredOutput = "json_schema" | "json_object";

export interface StoredProviderSettings {
  schemaVersion: "0.1";
  adapter: "openai-compatible";
  apiKey: string;
  model: string;
  baseUrl: string;
  structuredOutput: ProviderStructuredOutput;
  timeoutMs: number;
  updatedAt: string;
}

export interface ProviderSettingsInput {
  apiKey: string;
  model: string;
  baseUrl: string;
  structuredOutput: ProviderStructuredOutput;
  timeoutMs: number;
}

export interface ProviderSettingsMetadata {
  configured: boolean;
  source: "web" | "environment" | "none";
  adapter: "openai-compatible";
  model?: string;
  baseUrl?: string;
  structuredOutput?: ProviderStructuredOutput;
  timeoutMs?: number;
  updatedAt?: string;
}


export type ProviderCompatibilityCode =
  | "authentication"
  | "response_format"
  | "endpoint_or_model"
  | "rate_limit"
  | "timeout"
  | "provider"
  | "invalid_response";

export class ProviderCompatibilityError extends Error {
  constructor(
    message: string,
    readonly code: ProviderCompatibilityCode,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderCompatibilityError";
  }
}

type Environment = Readonly<Record<string, string | undefined>>;

const MAX_SETTINGS_BYTES = 16 * 1024;

function settingsPath(repoRoot: string): string {
  return path.join(repoRoot, ".ablearc-local", "provider-settings.json");
}

function text(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new Error(label + " is invalid.");
  }
  return value.trim();
}

function normalizeBaseUrl(value: unknown): string {
  const raw = text(value, "Provider base URL", 2000);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Provider base URL is invalid.");
  }
  const local = url.hostname === "localhost"
    || url.hostname === "127.0.0.1"
    || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new Error("Remote Provider URLs must use HTTPS; HTTP is only allowed for localhost.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Provider base URL cannot contain credentials, query parameters, or fragments.");
  }
  return url.toString().replace(/\/$/, "");
}

function normalizeSettings(value: ProviderSettingsInput): Omit<StoredProviderSettings, "schemaVersion" | "adapter" | "updatedAt"> {
  const structuredOutput = value.structuredOutput;
  if (structuredOutput !== "json_schema" && structuredOutput !== "json_object") {
    throw new Error("Structured output mode is invalid.");
  }
  const timeoutMs = Number(value.timeoutMs);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    throw new Error("Provider timeout must be from 1000 to 120000 milliseconds.");
  }
  return {
    apiKey: text(value.apiKey, "API key", 8192),
    model: text(value.model, "Model", 240),
    baseUrl: normalizeBaseUrl(value.baseUrl),
    structuredOutput,
    timeoutMs,
  };
}

export function readStoredProviderSettings(repoRoot: string): StoredProviderSettings | undefined {
  const target = settingsPath(repoRoot);
  if (!fs.existsSync(target)) return undefined;
  if (fs.lstatSync(target).isSymbolicLink()) {
    throw new Error("Provider settings must not be a symbolic link.");
  }
  if (fs.statSync(target).size > MAX_SETTINGS_BYTES) {
    throw new Error("Provider settings file is unexpectedly large.");
  }
  const parsed = JSON.parse(fs.readFileSync(target, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Provider settings are invalid.");
  }
  const item = parsed as Record<string, unknown>;
  if (
    item.schemaVersion !== "0.1"
    || item.adapter !== "openai-compatible"
    || typeof item.updatedAt !== "string"
  ) {
    throw new Error("Provider settings identity is invalid.");
  }
  const normalized = normalizeSettings({
    apiKey: item.apiKey as string,
    model: item.model as string,
    baseUrl: item.baseUrl as string,
    structuredOutput: item.structuredOutput as ProviderStructuredOutput,
    timeoutMs: Number(item.timeoutMs),
  });
  return {
    schemaVersion: "0.1",
    adapter: "openai-compatible",
    ...normalized,
    updatedAt: item.updatedAt,
  };
}

function responseFormat(mode: ProviderStructuredOutput): Record<string, unknown> {
  return mode === "json_object"
    ? { type: "json_object" }
    : {
        type: "json_schema",
        json_schema: {
          name: "ablearc_provider_probe",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["ok"],
            properties: { ok: { type: "boolean", const: true } },
          },
        },
      };
}

function providerFailureMessage(
  status: number,
  detail: string,
  mode: ProviderStructuredOutput,
): ProviderCompatibilityError {
  if (status === 401 || status === 403) {
    return new ProviderCompatibilityError(
      "Provider authentication failed. Check the API key and account access.",
      "authentication",
      status,
    );
  }
  if (status === 429) {
    return new ProviderCompatibilityError(
      "Provider rate-limited the setup check. Try again after the provider limit resets.",
      "rate_limit",
      status,
    );
  }
  if (
    (status === 400 || status === 422)
    && /response[_ -]?format|json[_ -]?schema|schema|unsupported|not supported/i.test(detail)
  ) {
    const label = mode === "json_schema" ? "Strict JSON Schema" : "JSON Object";
    return new ProviderCompatibilityError(
      `Provider rejected the selected structured-output mode (${label}). Choose a compatible mode before saving.`,
      "response_format",
      status,
    );
  }
  if (status === 400 || status === 404 || status === 422) {
    return new ProviderCompatibilityError(
      "Provider rejected the setup check. Verify the model ID and base URL.",
      "endpoint_or_model",
      status,
    );
  }
  return new ProviderCompatibilityError(
    `Provider setup check failed with status ${status}.`,
    "provider",
    status,
  );
}

export async function probeProviderSettings(
  input: ProviderSettingsInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const normalized = normalizeSettings(input);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort("provider setup timeout"),
    Math.min(normalized.timeoutMs, 20_000),
  );
  try {
    const response = await fetchImplementation(
      `${normalized.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${normalized.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: normalized.model,
          messages: [
            {
              role: "system",
              content: "This is an AbleArc provider compatibility check. Return only the requested JSON object.",
            },
            { role: "user", content: "Return {\\\"ok\\\": true}." },
          ],
          response_format: responseFormat(normalized.structuredOutput),
          max_tokens: 64,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 4096);
      throw providerFailureMessage(response.status, detail, normalized.structuredOutput);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ProviderCompatibilityError(
        "Provider setup check returned invalid JSON.",
        "invalid_response",
      );
    }
    const content = (payload as {
      choices?: Array<{ message?: { content?: unknown } }>;
    }).choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new ProviderCompatibilityError(
        "Provider setup check returned no structured content.",
        "invalid_response",
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ProviderCompatibilityError(
        "Provider setup check returned content that was not valid JSON.",
        "invalid_response",
      );
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || (parsed as { ok?: unknown }).ok !== true) {
      throw new ProviderCompatibilityError(
        "Provider setup check did not honor the requested structured output.",
        "invalid_response",
      );
    }
  } catch (error) {
    if (error instanceof ProviderCompatibilityError) throw error;
    if (controller.signal.aborted) {
      throw new ProviderCompatibilityError(
        "Provider setup check timed out. Verify the endpoint/model or increase the timeout.",
        "timeout",
      );
    }
    throw new ProviderCompatibilityError(
      "Provider setup check could not reach the configured endpoint.",
      "provider",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyAndWriteStoredProviderSettings(
  repoRoot: string,
  input: ProviderSettingsInput,
  fetchImplementation: typeof fetch = fetch,
  now = new Date().toISOString(),
): Promise<StoredProviderSettings> {
  await probeProviderSettings(input, fetchImplementation);
  return writeStoredProviderSettings(repoRoot, input, now);
}

export function writeStoredProviderSettings(
  repoRoot: string,
  input: ProviderSettingsInput,
  now = new Date().toISOString(),
): StoredProviderSettings {
  const normalized = normalizeSettings(input);
  const root = path.join(repoRoot, ".ablearc-local");
  fs.mkdirSync(root, { recursive: true });
  const target = settingsPath(repoRoot);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
    throw new Error("Provider settings must not be a symbolic link.");
  }
  const record: StoredProviderSettings = {
    schemaVersion: "0.1",
    adapter: "openai-compatible",
    ...normalized,
    updatedAt: now,
  };
  const temporary = target + "." + process.pid + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(record, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, target);
  try {
    fs.chmodSync(target, 0o600);
  } catch {
    // Best effort on filesystems/platforms without POSIX permission semantics.
  }
  return record;
}

export function removeStoredProviderSettings(repoRoot: string): void {
  const target = settingsPath(repoRoot);
  if (!fs.existsSync(target)) return;
  if (fs.lstatSync(target).isSymbolicLink()) {
    throw new Error("Provider settings must not be a symbolic link.");
  }
  fs.rmSync(target);
}

function envCredentialPresent(env: Environment): boolean {
  return Boolean(
    env.ABLEARC_PROVIDER_API_KEY
    || env.ABLEARC_PROVIDER_MODEL
    || env.AI4LEARNING_PROVIDER_API_KEY
    || env.AI4LEARNING_PROVIDER_MODEL,
  );
}

export function effectiveProviderEnvironment(
  repoRoot: string,
  env: Environment = process.env,
): Environment {
  if (envCredentialPresent(env)) return env;
  const stored = readStoredProviderSettings(repoRoot);
  if (!stored) return env;
  return {
    ...env,
    ABLEARC_PROVIDER_API_KEY: stored.apiKey,
    ABLEARC_PROVIDER_MODEL: stored.model,
    ABLEARC_PROVIDER_BASE_URL: stored.baseUrl,
    ABLEARC_PROVIDER_STRUCTURED_OUTPUT: stored.structuredOutput,
    ABLEARC_PROVIDER_TIMEOUT_MS: String(stored.timeoutMs),
  };
}

export function providerSettingsMetadata(
  repoRoot: string,
  env: Environment = process.env,
): ProviderSettingsMetadata {
  if (envCredentialPresent(env)) {
    return {
      configured: Boolean(
        (env.ABLEARC_PROVIDER_API_KEY ?? env.AI4LEARNING_PROVIDER_API_KEY)?.trim()
        && (env.ABLEARC_PROVIDER_MODEL ?? env.AI4LEARNING_PROVIDER_MODEL)?.trim()
      ),
      source: "environment",
      adapter: "openai-compatible",
      model: (env.ABLEARC_PROVIDER_MODEL ?? env.AI4LEARNING_PROVIDER_MODEL)?.trim(),
      baseUrl: (env.ABLEARC_PROVIDER_BASE_URL ?? env.AI4LEARNING_PROVIDER_BASE_URL)?.trim()
        || "https://api.openai.com/v1",
      structuredOutput: ((env.ABLEARC_PROVIDER_STRUCTURED_OUTPUT
        ?? env.AI4LEARNING_PROVIDER_STRUCTURED_OUTPUT
        ?? "json_schema") as ProviderStructuredOutput),
      timeoutMs: Number(env.ABLEARC_PROVIDER_TIMEOUT_MS ?? env.AI4LEARNING_PROVIDER_TIMEOUT_MS ?? 45000),
    };
  }
  const stored = readStoredProviderSettings(repoRoot);
  if (!stored) {
    return { configured: false, source: "none", adapter: "openai-compatible" };
  }
  return {
    configured: true,
    source: "web",
    adapter: "openai-compatible",
    model: stored.model,
    baseUrl: stored.baseUrl,
    structuredOutput: stored.structuredOutput,
    timeoutMs: stored.timeoutMs,
    updatedAt: stored.updatedAt,
  };
}
