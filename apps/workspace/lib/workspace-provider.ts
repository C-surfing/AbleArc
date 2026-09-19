import {
  createConfiguredAgentAdapter,
  getAgentProviderStatus,
  type AgentAdapter,
} from "./agent-adapter";
import {
  effectiveProviderEnvironment,
  providerSettingsMetadata,
} from "./provider-settings";
import type { AgentProviderStatus } from "./types";

export function getWorkspaceProviderStatus(repoRoot: string): AgentProviderStatus {
  const metadata = providerSettingsMetadata(repoRoot);
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
