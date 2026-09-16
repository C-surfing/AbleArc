import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentAdapterError,
  getAgentProviderStatus,
  OpenAICompatibleAdapter,
  readOpenAICompatibleConfig,
} from "./agent-adapter.ts";

const request = {
  name: "teaching_turn_advance",
  system: "Assess one learning turn.",
  prompt: "Learner observation",
  schema: { type: "object", additionalProperties: false },
};

test("provider config is absent until both secret and model are set", () => {
  assert.equal(readOpenAICompatibleConfig({}), undefined);
  assert.equal(readOpenAICompatibleConfig({ AI4LEARNING_PROVIDER_API_KEY: "secret" }), undefined);
});

test("remote provider URLs require HTTPS", () => {
  assert.throws(
    () => readOpenAICompatibleConfig({
      AI4LEARNING_PROVIDER_API_KEY: "secret",
      AI4LEARNING_PROVIDER_MODEL: "test-model",
      AI4LEARNING_PROVIDER_BASE_URL: "http://provider.example/v1",
    }),
    (error) => error instanceof AgentAdapterError && error.code === "configuration",
  );
  assert.equal(
    readOpenAICompatibleConfig({
      AI4LEARNING_PROVIDER_API_KEY: "secret",
      AI4LEARNING_PROVIDER_MODEL: "test-model",
      AI4LEARNING_PROVIDER_BASE_URL: "http://localhost:9000/v1/",
    })?.baseUrl,
    "http://localhost:9000/v1",
  );
});

test("invalid provider config degrades to a safe Workspace status", () => {
  assert.deepEqual(getAgentProviderStatus({
    AI4LEARNING_PROVIDER_API_KEY: "secret",
    AI4LEARNING_PROVIDER_MODEL: "test-model",
    AI4LEARNING_PROVIDER_BASE_URL: "http://provider.example/v1",
  }), {
    configured: false,
    adapter: "openai-compatible",
    error: "Provider configuration is invalid. Check the server environment.",
  });
});

test("adapter sends strict structured output to the compatible chat endpoint", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const adapter = new OpenAICompatibleAdapter(
    {
      apiKey: "server-only-secret",
      baseUrl: "https://provider.example/v1",
      model: "test-model",
      timeoutMs: 2_000,
    },
    async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  );

  assert.deepEqual(await adapter.generateStructured(request), { ok: true });
  assert.equal(capturedUrl, "https://provider.example/v1/chat/completions");
  assert.equal((capturedInit?.headers as Record<string, string>).authorization, "Bearer server-only-secret");
  const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
  assert.deepEqual(body.response_format, {
    type: "json_schema",
    json_schema: {
      name: request.name,
      strict: true,
      schema: request.schema,
    },
  });
});

test("adapter converts refusal and malformed content into typed errors", async (t) => {
  await t.test("refusal", async () => {
    const adapter = new OpenAICompatibleAdapter(
      { apiKey: "x", baseUrl: "https://provider.example/v1", model: "m", timeoutMs: 2_000 },
      async () => new Response(JSON.stringify({ choices: [{ message: { refusal: "no" } }] })),
    );
    await assert.rejects(
      adapter.generateStructured(request),
      (error) => error instanceof AgentAdapterError && error.code === "refusal",
    );
  });
  await t.test("malformed structured content", async () => {
    const adapter = new OpenAICompatibleAdapter(
      { apiKey: "x", baseUrl: "https://provider.example/v1", model: "m", timeoutMs: 2_000 },
      async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] })),
    );
    await assert.rejects(
      adapter.generateStructured(request),
      (error) => error instanceof AgentAdapterError && error.code === "invalid_response",
    );
  });
});
