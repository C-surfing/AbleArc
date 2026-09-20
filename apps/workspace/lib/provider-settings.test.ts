import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  effectiveProviderEnvironment,
  providerSettingsMetadata,
  ProviderCompatibilityError,
  probeProviderSettings,
  readStoredProviderSettings,
  removeStoredProviderSettings,
  verifyAndWriteStoredProviderSettings,
  writeStoredProviderSettings,
} from "./provider-settings.ts";

test("web provider settings persist locally without exposing secrets through metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-provider-"));
  try {
    const saved = writeStoredProviderSettings(root, {
      apiKey: "secret-key",
      model: "example-model",
      baseUrl: "https://provider.example/v1/",
      structuredOutput: "json_schema",
      timeoutMs: 45000,
    }, "2026-09-19T00:00:00Z");

    assert.equal(saved.baseUrl, "https://provider.example/v1");
    assert.equal(readStoredProviderSettings(root)?.apiKey, "secret-key");

    const metadata = providerSettingsMetadata(root, {});
    assert.equal(metadata.configured, true);
    assert.equal(metadata.source, "web");
    assert.equal(metadata.model, "example-model");
    assert.equal("apiKey" in metadata, false);

    const env = effectiveProviderEnvironment(root, {});
    assert.equal(env.ABLEARC_PROVIDER_API_KEY, "secret-key");
    assert.equal(env.ABLEARC_PROVIDER_MODEL, "example-model");

    const storedPath = path.join(root, ".ablearc-local", "provider-settings.json");
    assert.equal(fs.existsSync(storedPath), true);

    removeStoredProviderSettings(root);
    assert.equal(readStoredProviderSettings(root), undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("explicit environment credentials take precedence over web settings", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-provider-env-"));
  try {
    writeStoredProviderSettings(root, {
      apiKey: "web-secret",
      model: "web-model",
      baseUrl: "https://web.example/v1",
      structuredOutput: "json_schema",
      timeoutMs: 45000,
    });

    const environment = {
      ABLEARC_PROVIDER_API_KEY: "env-secret",
      ABLEARC_PROVIDER_MODEL: "env-model",
      ABLEARC_PROVIDER_BASE_URL: "https://env.example/v1",
    };
    assert.equal(effectiveProviderEnvironment(root, environment), environment);
    assert.equal(providerSettingsMetadata(root, environment).source, "environment");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("web provider settings reject insecure remote URLs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-provider-url-"));
  try {
    assert.throws(
      () => writeStoredProviderSettings(root, {
        apiKey: "secret",
        model: "model",
        baseUrl: "http://provider.example/v1",
        structuredOutput: "json_schema",
        timeoutMs: 45000,
      }),
      /HTTPS/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("provider setup probe verifies the selected structured-output mode", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const fakeFetch: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  await probeProviderSettings({
    apiKey: "secret",
    model: "example-model",
    baseUrl: "https://provider.example/v1",
    structuredOutput: "json_schema",
    timeoutMs: 45000,
  }, fakeFetch);

  assert.deepEqual(requestBody?.response_format, {
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
  });
});

test("provider setup reports structured-output incompatibility precisely", async () => {
  const fakeFetch: typeof fetch = async () => new Response(
    JSON.stringify({ error: { message: "response_format json_schema is not supported" } }),
    { status: 400, headers: { "content-type": "application/json" } },
  );

  await assert.rejects(
    () => probeProviderSettings({
      apiKey: "secret",
      model: "deepseek-example",
      baseUrl: "https://api.deepseek.com",
      structuredOutput: "json_schema",
      timeoutMs: 45000,
    }, fakeFetch),
    (error: unknown) => error instanceof ProviderCompatibilityError
      && error.code === "response_format"
      && /structured-output mode/.test(error.message),
  );
});

test("failed provider probe does not persist settings", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-provider-probe-"));
  try {
    const fakeFetch: typeof fetch = async () => new Response(
      JSON.stringify({ error: { message: "invalid api key" } }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
    await assert.rejects(
      () => verifyAndWriteStoredProviderSettings(root, {
        apiKey: "bad-secret",
        model: "example-model",
        baseUrl: "https://provider.example/v1",
        structuredOutput: "json_object",
        timeoutMs: 45000,
      }, fakeFetch),
      (error: unknown) => error instanceof ProviderCompatibilityError
        && error.code === "authentication",
    );
    assert.equal(readStoredProviderSettings(root), undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
