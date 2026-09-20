"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./provider-setup.module.css";

interface ProviderMetadata {
  configured: boolean;
  source: "web" | "environment" | "none";
  model?: string;
  baseUrl?: string;
  structuredOutput?: "json_schema" | "json_object";
  timeoutMs?: number;
}

type Preset = "openai" | "deepseek" | "custom";

function inferPreset(baseUrl?: string): Preset {
  if (baseUrl?.includes("api.deepseek.com")) return "deepseek";
  if (!baseUrl || baseUrl.includes("api.openai.com")) return "openai";
  return "custom";
}

export function ProviderSetup({
  initial,
  mode,
}: {
  initial: ProviderMetadata;
  mode: "onboarding" | "settings";
}) {
  const router = useRouter();
  const initialPreset = useMemo(() => inferPreset(initial.baseUrl), [initial.baseUrl]);
  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.model || "");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || "https://api.openai.com/v1");
  const [structuredOutput, setStructuredOutput] = useState<"json_schema" | "json_object">(
    initial.structuredOutput || "json_schema",
  );
  const [timeoutMs, setTimeoutMs] = useState(String(initial.timeoutMs || 120000));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const environmentManaged = initial.source === "environment";

  function choosePreset(next: Preset) {
    setPreset(next);
    if (next === "openai") {
      setBaseUrl("https://api.openai.com/v1");
      setStructuredOutput("json_schema");
    } else if (next === "deepseek") {
      setBaseUrl("https://api.deepseek.com");
      setStructuredOutput("json_object");
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || environmentManaged) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/provider-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          apiKey,
          model,
          baseUrl,
          structuredOutput,
          timeoutMs: Number(timeoutMs),
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not save model settings.");
      setApiKey("");
      setMessage("Model connection verified and settings saved.");
      router.refresh();
      if (mode === "onboarding") router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save model settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={mode === "onboarding" ? styles.onboarding : styles.settings}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <span>AbleArc · Model setup</span>
            <h1>{mode === "onboarding" ? "Connect a model to start learning." : "Model provider"}</h1>
            <p>
              AbleArc keeps learner state local. Your API key is stored server-side in the local Git-ignored
              workspace and is never returned to the browser after saving.
            </p>
          </div>
          {initial.configured ? <strong className={styles.ready}>Configured</strong> : null}
        </header>

        {environmentManaged ? (
          <div className={styles.notice}>
            <strong>This deployment manages the model through server environment variables.</strong>
            <p>Web settings are read-only while that deployment override is present.</p>
          </div>
        ) : (
          <form onSubmit={save} className={styles.form}>
            <label>
              <span>Provider</span>
              <select value={preset} onChange={(event) => choosePreset(event.target.value as Preset)}>
                <option value="openai">OpenAI-compatible</option>
                <option value="deepseek">DeepSeek-compatible</option>
                <option value="custom">Custom OpenAI-compatible endpoint</option>
              </select>
            </label>

            <label>
              <span>API key</span>
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={initial.source === "web" ? "Leave blank to keep the saved key" : "Paste your provider API key"}
              />
            </label>

            <label>
              <span>Model</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                maxLength={240}
                placeholder="Model ID from your provider"
                required
              />
            </label>

            <label>
              <span>Base URL</span>
              <input
                value={baseUrl}
                onChange={(event) => {
                  const next = event.target.value;
                  setBaseUrl(next);
                  const inferred = inferPreset(next);
                  setPreset(inferred);
                  if (inferred === "deepseek") setStructuredOutput("json_object");
                  if (inferred === "openai") setStructuredOutput("json_schema");
                }}
                maxLength={2000}
                placeholder="https://api.openai.com/v1"
                required
              />
            </label>

            <details className={styles.advanced}>
              <summary>Advanced compatibility</summary>
              <div className={styles.advancedGrid}>
                <label>
                  <span>Structured output</span>
                  <select
                    value={structuredOutput}
                    onChange={(event) => setStructuredOutput(event.target.value as "json_schema" | "json_object")}
                  >
                    <option value="json_schema">Strict JSON Schema</option>
                    <option value="json_object">JSON Object</option>
                  </select>
                </label>
                <label>
                  <span>Timeout (ms)</span>
                  <input
                    type="number"
                    min={1000}
                    max={120000}
                    step={1000}
                    value={timeoutMs}
                    onChange={(event) => setTimeoutMs(event.target.value)}
                  />
                </label>
              </div>
            </details>

            <div className={styles.actions}>
              <button
                type="submit"
                disabled={
                  busy
                  || !model.trim()
                  || !baseUrl.trim()
                  || (!apiKey.trim() && initial.source !== "web")
                }
              >
                {busy ? "Checking connection…" : mode === "onboarding" ? "Verify, save, and enter AbleArc" : "Verify and save settings"}
              </button>
              <span>No command-line model configuration is required for normal Web use.</span>
            </div>
          </form>
        )}

        {message ? <p className={styles.message} role="status">{message}</p> : null}

        <footer className={styles.boundary}>
          <strong>What gets sent to the provider?</strong>
          <p>
            Only the bounded context needed for the current teaching, paper-planning, or research request.
            Runtime learner-state authority stays inside AbleArc.
          </p>
        </footer>
      </section>
    </div>
  );
}
