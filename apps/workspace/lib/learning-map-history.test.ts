import assert from "node:assert/strict";
import test from "node:test";
import { parseLearningMapNodeHistory } from "./learning-map-history.ts";

function payload() {
  return {
    project_id: "bayes",
    node_id: "bayes-reasoning",
    current_revision: 3,
    events: [
      {
        revision: 3,
        updated_at: "2026-09-17T04:30:00Z",
        rationale: "Transfer became the next frontier.",
        evidence_count: 2,
        changes: ["node_changed", "left_frontier", "relations_changed"],
        before: {
          label: "Bayes reasoning",
          kind: "strategy",
          mission_relevance: "core",
          frontier: true,
          relations: ["in: Conditional probability → prerequisite (high)"],
        },
        after: {
          label: "Posterior Bayes reasoning",
          kind: "strategy",
          mission_relevance: "core",
          frontier: false,
          relations: [
            "in: Conditional probability → prerequisite (high)",
            "out: transfer → Novel-context transfer (medium)",
          ],
        },
      },
      {
        revision: 1,
        updated_at: "2026-09-17T03:30:00Z",
        rationale: "Bayes reasoning entered the route.",
        evidence_count: 1,
        changes: ["added", "entered_frontier", "relations_changed"],
        before: null,
        after: {
          label: "Bayes reasoning",
          kind: "strategy",
          mission_relevance: "core",
          frontier: true,
          relations: ["in: Conditional probability → prerequisite (high)"],
        },
      },
    ],
  };
}

test("parses newest-first meaningful LearningMap node history", () => {
  const history = parseLearningMapNodeHistory(payload(), "bayes", "bayes-reasoning");
  assert.equal(history.currentRevision, 3);
  assert.deepEqual(history.events.map((event) => event.revision), [3, 1]);
  assert.equal(history.events[0].before?.frontier, true);
  assert.equal(history.events[0].after?.frontier, false);
  assert.deepEqual(history.events[1].changes, ["added", "entered_frontier", "relations_changed"]);
});

test("fails closed on Project/node scope or revision ordering drift", () => {
  assert.throws(() => parseLearningMapNodeHistory(payload(), "rust", "bayes-reasoning"), /Project scope/);
  assert.throws(() => parseLearningMapNodeHistory(payload(), "bayes", "conditional-probability"), /node scope/);

  const bad = payload();
  bad.events[1].revision = 3;
  assert.throws(() => parseLearningMapNodeHistory(bad, "bayes", "bayes-reasoning"), /ordering/);
});

test("rejects invalid history change kinds and empty snapshots", () => {
  const badChange = payload();
  badChange.events[0].changes = ["mastery_changed"];
  assert.throws(() => parseLearningMapNodeHistory(badChange, "bayes", "bayes-reasoning"), /change kinds/);

  const empty: any = payload();
  empty.events[0].before = null;
  empty.events[0].after = null;
  assert.throws(() => parseLearningMapNodeHistory(empty, "bayes", "bayes-reasoning"), /before or after/);
});
