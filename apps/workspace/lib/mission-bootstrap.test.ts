import assert from "node:assert/strict";
import { test } from "node:test";
import { initialMissionCompletionCriteria } from "./mission-bootstrap.ts";

test("Web Mission bootstrap creates an unearned reconstruction + application contract", () => {
  const criteria = initialMissionCompletionCriteria(
    "Explain Ethereum world state and apply the model to unfamiliar transaction examples",
  );

  assert.equal(criteria.length, 2);
  assert.deepEqual(criteria.map((item) => item.kind), ["feynman", "application"]);
  assert.ok(criteria.every((item) => item.required));
  assert.ok(criteria.every((item) => item.evidence_ids.length === 0));
  assert.ok(criteria.every((item) => item.capability.length <= 500));
  assert.equal(criteria[0]?.minimum_independence, "independent");
  assert.equal(criteria[1]?.minimum_context, "varied");
});

test("Web Mission bootstrap bounds long learner goals without losing a usable criterion", () => {
  const criteria = initialMissionCompletionCriteria("目标".repeat(800));
  assert.equal(criteria.length, 2);
  assert.ok(criteria.every((item) => item.capability.length <= 500));
  assert.ok(criteria.every((item) => item.capability.endsWith("…")));
});
