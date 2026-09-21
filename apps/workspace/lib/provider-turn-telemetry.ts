import type { AgentAdapter } from "./agent-adapter.ts";

export interface ProviderTurnTelemetry {
  provider: string;
  model: string;
  attempt_count: number;
  duration_ms: number;
}

export interface InstrumentedAgentAdapter {
  adapter: AgentAdapter;
  finish(): ProviderTurnTelemetry;
}

/**
 * Count Provider calls made by one logical learning turn, including bounded
 * structured-output repair attempts. This is operational telemetry only: it
 * must never be interpreted as learner Evidence or mastery.
 */
export function instrumentAgentAdapter(
  source: AgentAdapter,
  now: () => number = Date.now,
): InstrumentedAgentAdapter {
  const startedAt = now();
  let attempts = 0;

  const adapter: AgentAdapter = {
    id: source.id,
    model: source.model,
    async generateStructured(request) {
      attempts += 1;
      return source.generateStructured(request);
    },
  };

  return {
    adapter,
    finish() {
      return {
        provider: source.id,
        model: source.model,
        attempt_count: attempts,
        duration_ms: Math.max(0, Math.round(now() - startedAt)),
      };
    },
  };
}
