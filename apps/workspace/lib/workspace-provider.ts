import {
  createConfiguredAgentAdapter,
  getAgentProviderStatus,
  type AgentAdapter,
} from "./agent-adapter.ts";
import {
  effectiveProviderEnvironment,
  providerSettingsMetadata,
} from "./provider-settings.ts";
import type { AgentProviderStatus } from "./types.ts";

export function getWorkspaceProviderStatus(repoRoot: string): AgentProviderStatus {
  let metadata;
  try {
    metadata = providerSettingsMetadata(repoRoot);
  } catch {
    return {
      configured: false,
      adapter: "openai-compatible",
      source: "web",
      error: "Local Provider settings are invalid. Open Settings and save them again.",
    };
  }
  const status = getAgentProviderStatus(effectiveProviderEnvironment(repoRoot));
  return {
    ...status,
    source: status.configured ? metadata.source : metadata.source === "none" ? "none" : metadata.source,
    ...(status.configured && metadata.baseUrl ? { baseUrl: metadata.baseUrl } : {}),
    ...(status.configured && metadata.structuredOutput ? { structuredOutput: metadata.structuredOutput } : {}),
  };
}

export function createWorkspaceAgentAdapter(
  repoRoot: string,
  fetchImplementation: typeof fetch = fetch,
): AgentAdapter {
  return createConfiguredAgentAdapter(
    effectiveProviderEnvironment(repoRoot),
    fetchImplementation,
  );
}
