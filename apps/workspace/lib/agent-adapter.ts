import type { AgentProviderStatus } from "./types";

type Environment = Readonly<Record<string, string | undefined>>;

export interface StructuredGenerationRequest {
  name: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AgentAdapter {
  readonly id: string;
  readonly model: string;
  generateStructured(request: StructuredGenerationRequest): Promise<unknown>;
}

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export class AgentAdapterError extends Error {
  constructor(
    message: string,
    readonly code: "configuration" | "timeout" | "provider" | "invalid_response" | "refusal",
    readonly status?: number,
  ) {
    super(message);
    this.name = "AgentAdapterError";
  }
}

function normalizedBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AgentAdapterError("Provider base URL is invalid.", "configuration");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new AgentAdapterError("Provider base URL must use HTTP or HTTPS.", "configuration");
  }
  const local = url.hostname === "localhost"
    || url.hostname === "127.0.0.1"
    || url.hostname === "[::1]";
  if (url.protocol === "http:" && !local) {
    throw new AgentAdapterError(
      "Remote Provider URLs must use HTTPS; plain HTTP is limited to localhost.",
      "configuration",
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AgentAdapterError(
      "Provider base URL cannot contain credentials, query parameters, or fragments.",
      "configuration",
    );
  }
  return url.toString().replace(/\/$/, "");
}

export function readOpenAICompatibleConfig(
  env: Environment = process.env,
): OpenAICompatibleConfig | undefined {
  const apiKey = env.AI4LEARNING_PROVIDER_API_KEY?.trim();
  const model = env.AI4LEARNING_PROVIDER_MODEL?.trim();
  if (!apiKey || !model) return undefined;
  const parsedTimeout = Number(env.AI4LEARNING_PROVIDER_TIMEOUT_MS || 45_000);
  if (!Number.isInteger(parsedTimeout) || parsedTimeout < 1_000 || parsedTimeout > 120_000) {
    throw new AgentAdapterError(
      "AI4LEARNING_PROVIDER_TIMEOUT_MS must be an integer from 1000 to 120000.",
      "configuration",
    );
  }
  return {
    apiKey,
    model,
    baseUrl: normalizedBaseUrl(
      env.AI4LEARNING_PROVIDER_BASE_URL?.trim() || "https://api.openai.com/v1",
    ),
    timeoutMs: parsedTimeout,
  };
}

export function getAgentProviderStatus(
  env: Environment = process.env,
): AgentProviderStatus {
  try {
    const config = readOpenAICompatibleConfig(env);
    return {
      configured: Boolean(config),
      adapter: "openai-compatible",
      ...(config ? { model: config.model } : {}),
    };
  } catch (error) {
    if (!(error instanceof AgentAdapterError)) throw error;
    return {
      configured: false,
      adapter: "openai-compatible",
      error: "Provider configuration is invalid. Check the server environment.",
    };
  }
}

export class OpenAICompatibleAdapter implements AgentAdapter {
  readonly id = "openai-compatible";
  readonly model: string;

  constructor(
    private readonly config: OpenAICompatibleConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {
    this.model = config.model;
  }

  async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    const controller = new AbortController();
    const onAbort = () => controller.abort(request.signal?.reason);
    request.signal?.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort("provider timeout"), this.config.timeoutMs);
    try {
      const response = await this.fetchImplementation(
        `${this.config.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.config.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: request.name,
                strict: true,
                schema: request.schema,
              },
            },
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new AgentAdapterError(
          `Provider request failed with status ${response.status}.`,
          "provider",
          response.status,
        );
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new AgentAdapterError("Provider returned invalid JSON.", "invalid_response");
      }
      const message = (payload as {
        choices?: Array<{ message?: { content?: unknown; refusal?: unknown } }>;
      }).choices?.[0]?.message;
      if (typeof message?.refusal === "string" && message.refusal.trim()) {
        throw new AgentAdapterError("Provider refused the structured assessment.", "refusal");
      }
      if (typeof message?.content !== "string") {
        throw new AgentAdapterError(
          "Provider response did not contain structured content.",
          "invalid_response",
        );
      }
      try {
        return JSON.parse(message.content);
      } catch {
        throw new AgentAdapterError(
          "Provider structured content was not valid JSON.",
          "invalid_response",
        );
      }
    } catch (error) {
      if (error instanceof AgentAdapterError) throw error;
      if (controller.signal.aborted) {
        throw new AgentAdapterError("Provider request timed out or was cancelled.", "timeout");
      }
      throw new AgentAdapterError("Provider request could not be completed.", "provider");
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener("abort", onAbort);
    }
  }
}

export function createConfiguredAgentAdapter(
  env: Environment = process.env,
  fetchImplementation: typeof fetch = fetch,
): AgentAdapter {
  const config = readOpenAICompatibleConfig(env);
  if (!config) {
    throw new AgentAdapterError(
      "No Provider is configured. Set AI4LEARNING_PROVIDER_API_KEY and AI4LEARNING_PROVIDER_MODEL.",
      "configuration",
    );
  }
  return new OpenAICompatibleAdapter(config, fetchImplementation);
}
