import assert from "node:assert/strict";
import test from "node:test";
import type { AgentAdapter, StructuredGenerationRequest } from "./agent-adapter.ts";
import { parseHostTurnInput } from "./host-turn.ts";
import {
  PaperSourceContextError,
  buildPaperSourceContext,
  generatePaperLearningPlan,
  validatePaperLearningPlan,
} from "./paper-learning.ts";

function generatedPlan(): Record<string, unknown> {
  return {
    study_mode: "understanding_first",
    source_title: "Example Attention Paper",
    research_problem: "The source asks how to model sequence relationships without relying on recurrence.",
    importance: "The source motivates a more parallelizable way to represent dependencies between sequence positions.",
    claims: [
      {
        id: "attention-only",
        statement: "The proposed architecture can model the target sequence task using attention without recurrence.",
        source_basis: "The supplied abstract and method excerpt explicitly frame the architecture around attention while removing recurrent computation.",
      },
    ],
    method: {
      summary: "The method maps sequence positions through attention-based interactions and feed-forward transformations.",
      mechanism_steps: [
        "Represent tokens and position information.",
        "Compute attention interactions between positions.",
        "Transform the attended representation with position-wise feed-forward layers.",
      ],
    },
    evidence: [
      {
        claim_ids: ["attention-only"],
        result: "The supplied results excerpt reports competitive task performance.",
        interpretation: "Within the reported benchmark, the attention-based architecture supports the paper's central feasibility claim.",
        limits: "The supplied excerpt does not establish that the same advantage holds for every sequence domain.",
      },
    ],
    limitations: [
      "The supplied source excerpt does not establish behavior outside the reported benchmark.",
    ],
    figures_equations: [
      {
        label: "Attention equation",
        role: "Makes the weighting mechanism explicit and is useful for connecting query/key compatibility to the resulting mixture.",
        prerequisite: "Dot products, softmax, and weighted sums.",
      },
    ],
    prerequisites: [
      {
        id: "dot-products",
        label: "Dot products",
        why_needed: "Needed to interpret the compatibility score used in the attention equation.",
        confidence: "high",
        self_report_status: "reported_familiar",
      },
      {
        id: "softmax",
        label: "Softmax",
        why_needed: "Needed to understand how compatibility scores become normalized attention weights.",
        confidence: "high",
        self_report_status: "reported_shaky",
      },
    ],
    onboarding_questions: [
      {
        question: "When you see softmax, are you comfortable explaining why its outputs can be used as relative weights?",
        decision_value: "Determines whether the first explanation can start from the attention mechanism or needs a short normalization detour.",
        prerequisite_ids: ["softmax"],
      },
    ],
    initial_path: [
      {
        label: "Why remove recurrence?",
        purpose: "Establish the problem pressure that makes the architecture meaningful.",
        prerequisite_ids: [],
      },
      {
        label: "Attention as a weighted interaction",
        purpose: "Build the mechanism before introducing the full architecture.",
        prerequisite_ids: ["dot-products", "softmax"],
      },
      {
        label: "Connect reported evidence to the central claim",
        purpose: "Separate what the benchmark supports from broader conclusions.",
        prerequisite_ids: [],
      },
    ],
    first_move: {
      kind: "explain",
      target: "problem pressure behind the architecture",
      message: "The useful starting point is not the layer diagram. It is the constraint the paper is trying to remove: recurrence forces sequential computation, while the proposed attention mechanism lets positions interact without that same dependency chain.",
      learner_action: "After that distinction, identify which part of the method actually allows one position to use information from another.",
    },
  };
}

function paperTurn() {
  return parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "fixture-host", conversationId: "conv-paper-1" },
    message: "I want to really understand this paper, not just follow the section order.",
    references: [
      {
        id: "paper-1",
        kind: "file",
        label: "Example Attention Paper",
        locator: "host://attachment/paper-1",
        excerpt: "Abstract: We propose an attention-based architecture without recurrent computation. Method: attention computes weighted interactions between sequence positions. Equation: softmax(QK^T)V. Results: the method reports competitive benchmark performance.",
        mediaType: "application/pdf",
      },
    ],
    selfReport: {
      priorKnowledge: "I know dot products, but softmax still feels mechanical.",
      intent: "explain",
      desiredRigor: "rigorous",
    },
    capabilities: ["read_attachment"],
  });
}

test("paper source context uses resolved excerpts and preserves reference identity", () => {
  const context = buildPaperSourceContext(paperTurn());
  assert.deepEqual(context.referencesUsed, ["paper-1"]);
  assert.match(context.sourceText, /Example Attention Paper/);
  assert.match(context.sourceText, /softmax\(QK\^T\)V/);
});

test("paper source context requests a host capability instead of pretending a locator was read", () => {
  const turn = parseHostTurnInput({
    schemaVersion: "0.1",
    host: { id: "fixture-host" },
    message: "Teach me this paper.",
    references: [{
      id: "paper-remote",
      kind: "file",
      label: "Unread PDF",
      locator: "host://attachment/paper-remote",
      mediaType: "application/pdf",
    }],
    capabilities: ["read_attachment"],
  });
  assert.throws(
    () => buildPaperSourceContext(turn),
    (error: unknown) => {
      assert.ok(error instanceof PaperSourceContextError);
      assert.equal(error.requestedCapability, "read_attachment");
      assert.deepEqual(error.referenceIds, ["paper-remote"]);
      return true;
    },
  );
});

test("paper plan validator keeps source reconstruction and prerequisite hypotheses typed", () => {
  const plan = validatePaperLearningPlan(generatedPlan(), ["paper-1"]);
  assert.equal(plan.studyMode, "understanding_first");
  assert.equal(plan.claims[0]?.id, "attention-only");
  assert.equal(plan.prerequisites[1]?.selfReportStatus, "reported_shaky");
  assert.equal(plan.onboardingQuestions.length, 1);
  assert.equal(plan.firstMove.kind, "explain");
  assert.deepEqual(plan.referencesUsed, ["paper-1"]);
});

test("paper plan validator rejects unsupported claim links and onboarding sprawl", () => {
  const unknownClaim = generatedPlan();
  ((unknownClaim.evidence as Array<Record<string, unknown>>)[0]).claim_ids = ["missing-claim"];
  assert.throws(
    () => validatePaperLearningPlan(unknownClaim, ["paper-1"]),
    /unknown claim/,
  );

  const tooManyQuestions = generatedPlan();
  tooManyQuestions.onboarding_questions = Array.from({ length: 5 }, (_, index) => ({
    question: `Question ${index}`,
    decision_value: "Changes the route.",
    prerequisite_ids: [],
  }));
  assert.throws(
    () => validatePaperLearningPlan(tooManyQuestions, ["paper-1"]),
    /at most four/,
  );
});

test("paper planner grounds in supplied source and treats self-report only as routing context", async () => {
  let request: StructuredGenerationRequest | undefined;
  const adapter: AgentAdapter = {
    id: "fixture",
    model: "fixture-model",
    async generateStructured(value) {
      request = value;
      return generatedPlan();
    },
  };

  const plan = await generatePaperLearningPlan(adapter, {
    turn: paperTurn(),
    requestedMode: "auto",
  });

  assert.equal(plan.sourceTitle, "Example Attention Paper");
  assert.match(request?.system || "", /Ground the paper reconstruction only in the supplied source context/);
  assert.match(request?.system || "", /Do not treat learner self-report as mastery/);
  assert.match(request?.system || "", /zero to four onboarding questions/);
  assert.match(request?.system || "", /useful first move immediately/);
  assert.match(request?.system || "", /no learner-state authority/);
  assert.match(request?.prompt || "", /softmax still feels mechanical/);
  assert.match(request?.prompt || "", /attention-based architecture/);
});
