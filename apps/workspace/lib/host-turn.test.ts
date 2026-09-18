import assert from "node:assert/strict";
import test from "node:test";
import {
  createHostTurnOutput,
  parseHostTurnInput,
} from "./host-turn.ts";

test("host turn accepts natural message, learner references, self-report, and capabilities", () => {
  const value = parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "chat-host", conversationId: "conv:123" },
    message: "I am following these slides. I know forward propagation, but backprop still feels mechanical.",
    projectId: "mlp",
    missionId: "primary-mission",
    references: [{
      id: "slides-1",
      kind: "file",
      label: "Lecture slides",
      locator: "host://attachment/slides-1",
      mediaType: "application/pdf",
    }],
    selfReport: {
      priorKnowledge: "I can explain the forward pass.",
      uncertainty: "I do not understand why each local derivative appears.",
      desiredRigor: "rigorous",
      intent: "explain",
      constraints: ["Use the notation from the slides."],
    },
    capabilities: ["read_attachment", "render_diagram"],
    presentation: { language: "zh-CN", maxChars: 2400 },
  });

  assert.equal(value.references[0]?.id, "slides-1");
  assert.equal(value.selfReport?.intent, "explain");
  assert.deepEqual(value.capabilities, ["read_attachment", "render_diagram"]);
});

test("host turn keeps self-report contextual and rejects unsupported/ambiguous transport fields", () => {
  assert.throws(() => parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "chat-host" },
    message: "Teach me.",
    references: [],
    capabilities: [],
    mastery: "stable",
  }), /unsupported fields/);

  assert.throws(() => parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "chat-host" },
    message: "Use this.",
    references: [{ id: "r1", kind: "file" }],
    capabilities: [],
  }), /requires locator or excerpt/);
});

test("host output separates presentation from control", () => {
  const output = createHostTurnOutput(
    "Your forward-pass picture is fine. The missing piece is why the gradient at one layer splits into a local derivative and the upstream signal.",
    {},
    { referencesUsed: ["slides-1"] },
  );

  assert.equal(output.presentation.referencesUsed[0], "slides-1");
  assert.deepEqual(output.control, {});
  assert.ok(!("confidence" in output.presentation));
});
