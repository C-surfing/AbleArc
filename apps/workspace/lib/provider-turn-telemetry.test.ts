import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentAdapter } from "./agent-adapter.ts";
import { instrumentAgentAdapter } from "./provider-turn-telemetry.ts";

test("Provider turn telemetry counts repair calls and measures the successful turn", async () => {
  let clock = 1_000;
  let calls = 0;
  const source: AgentAdapter = {
    id: "fixture-provider",
    model: "fixture-model",
    async generateStructured() {
      calls += 1;
      return { ok: true };
    },
  };

  const measured = instrumentAgentAdapter(source, () => clock);
  await measured.adapter.generateStructured({
    name: "first",
    system: "system",
    prompt: "prompt",
    schema: {},
  });
  await measured.adapter.generateStructured({
    name: "repair",
    system: "system",
    prompt: "prompt",
    schema: {},
  });
  clock = 1_147;

  assert.equal(calls, 2);
  assert.deepEqual(measured.finish(), {
    provider: "fixture-provider",
    model: "fixture-model",
    attempt_count: 2,
    duration_ms: 147,
  });
});
