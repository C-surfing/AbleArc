import * as z from "zod/v4";

export const ABLEARC_MCP_TOOL_NAMES = [
  "inspect_learning",
  "start_or_resume_learning",
  "record_learner_action",
  "commit_learning_turn",
] as const;

export const localId = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/);

export const inspectLearningInput = z.object({}).strict();

export const startOrResumeInput = z.object({
  projectId: localId.optional(),
  createNew: z.boolean().optional(),
  newProjectId: localId.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  goal: z.string().trim().min(1).max(1200).optional(),
  why: z.string().trim().min(1).max(2400).optional(),
}).strict();

export const recordLearnerActionInput = z.object({
  decisionId: z.string().regex(/^dec_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/),
  response: z.string().trim().min(1).max(12000),
  confirmsResponseMatchesCurrentMove: z.literal(true),
}).strict();

const conceptIds = z.array(
  z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
).min(1).max(12);

const optionalConceptIds = z.array(
  z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
).max(12);

export const teachingAdvanceInput = z.object({
  policy: z.object({
    challenge: z.enum(["unknown", "underloaded", "productive", "overloaded"]),
    rationale: z.string().trim().min(1).max(1200),
    review: z.object({
      disposition: z.enum(["continue_frontier", "review_now", "review_later", "unknown"]),
      concept_ids: optionalConceptIds,
      rationale: z.string().trim().min(1).max(1200),
    }).strict(),
    session: z.object({
      disposition: z.enum(["continue", "pause", "close"]),
      rationale: z.string().trim().min(1).max(1200),
    }).strict(),
    calibration: z.object({
      state: z.enum(["aligned", "possible_overestimate", "possible_underestimate", "unknown"]),
      rationale: z.string().trim().min(1).max(1200),
    }).strict(),
  }).strict(),
  assessment: z.object({
    level: z.enum(["recognition", "recall", "explanation", "application", "transfer"]),
    outcome: z.enum(["supports", "contradicts", "inconclusive"]),
    failure_mode: z.enum([
      "none",
      "slip",
      "missing_prerequisite",
      "vocabulary_confusion",
      "local_procedural_gap",
      "wrong_causal_model",
      "overgeneralization",
      "failed_transfer",
    ]),
    artifact_form: z.enum(["prose", "pseudocode", "code", "executed_code", "diagram"]),
    result_summary: z.string().trim().min(1).max(1600),
    scaffolding: z.enum(["none", "light", "heavy"]),
    context: z.enum(["same", "varied", "novel"]),
    delay: z.enum(["immediate", "delayed"]),
    independence: z.enum(["same_form", "new_form", "independent"]),
    supports: z.array(z.string().trim().min(1).max(500)).max(20),
    contradicts: z.array(z.string().trim().min(1).max(500)).max(20),
    confidence: z.enum(["low", "medium", "high"]),
  }).strict(),
  next_decision: z.object({
    mode: z.enum(["teach", "study"]),
    target: z.string().trim().min(1).max(500),
    concept_ids: conceptIds,
    frontier_hypothesis: z.string().trim().min(1).max(1600),
    uncertainty: z.enum(["low", "medium", "high"]),
    move: z.enum([
      "orient",
      "probe",
      "motivate",
      "establish_intuition",
      "name_or_formalize",
      "connect",
      "contrast",
      "derive",
      "worked_example",
      "prediction",
      "practice",
      "retrieve",
      "repair_misconception",
      "apply",
      "generalize",
      "transfer",
      "compress_or_reference",
    ]),
    rationale: z.string().trim().min(1).max(1600),
    learner_action: z.string().trim().min(1).max(1600),
    representation: z.object({
      kind: z.string().trim().min(1).max(120),
      purpose: z.string().trim().min(1).max(800),
    }).strict(),
    expected_evidence: z.string().trim().min(1).max(1600),
    falsification_signal: z.string().trim().min(1).max(1600),
  }).strict(),
}).strict();

export const commitLearningTurnInput = z.object({
  decisionId: z.string().regex(/^dec_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/),
  advance: teachingAdvanceInput,
}).strict();
