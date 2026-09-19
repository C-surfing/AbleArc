import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  effectiveProviderEnvironment,
  providerSettingsMetadata,
  readStoredProviderSettings,
  removeStoredProviderSettings,
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

    const storedPath = path.join(root, ".learning", "provider-settings.json");
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
