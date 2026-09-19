# Paper Learning v1

Status: **entry-planning slice implemented in Workspace server contracts**

Paper Learning is the first product scenario used to prove that AbleArc can turn source material into a personalized learning route rather than a generic summary.

## Goal

The first slice answers:

> Given a learner-provided paper and a small amount of learner context, what should AbleArc understand about the paper, what prerequisite hypotheses matter, and what is the first useful teaching move?

It does **not** yet claim that the learner understands the paper.

## Input boundary

Paper Learning reuses the existing `HostTurnInput` contract.

A host may provide:

- a learner message;
- one or more file / URL / text references;
- source excerpts already resolved by the host;
- learner self-report;
- available capabilities such as `read_attachment` or `retrieve_source`.

The Paper Learning planner does not invent a second attachment protocol.

```text
Host / Web
   ↓
HostTurn
   ↓
resolved paper/source excerpts
   ↓
Paper Learning planner
```

If a host supplies only an opaque PDF/file locator, AbleArc does **not** pretend it read the source. The planner returns a bounded capability request when the host has declared the required capability.

## Output contract

`apps/workspace/lib/paper-learning.ts` produces a typed `PaperLearningPlan`:

```text
study mode
source title
research problem
importance
claims
method / mechanism
evidence → claim links
limitations
important exposed figures/equations
prerequisite hypotheses
0–4 onboarding questions
initial learning path
first useful teaching move
source references used
```

The structure is intentionally argument-oriented:

```text
problem → claim → method → evidence → limitation
```

It is not a section-by-section summary contract.

## Two study modes

### follow_source

Use when the learner wants to follow a paper, lecture, or course in its original order.

AbleArc should broadly preserve source order while inserting bounded prerequisite repairs where needed.

### understanding_first

Use when the learner's goal is to understand the material regardless of source order.

AbleArc may reorder the route by dependency and explanatory value.

### auto

The request may leave mode selection to the planner. The planner infers intent from the learner message and returns one of the two concrete modes.

## Prerequisite hypotheses are not mastery

The planner may infer that a paper depends on concepts such as softmax, matrix multiplication, causal identification, or a statistical test.

These are teaching hypotheses.

Each prerequisite records:

- why it appears necessary;
- confidence in the hypothesis;
- whether learner self-report says it is familiar, shaky, or unknown.

Self-report remains routing context. It does not create accepted learner state.

## Onboarding budget

The planner may ask **zero to four** questions.

Every question must have explicit decision value: its answer should change the route, explanation, notation, or prerequisite repair.

Already supplied self-report must not be asked again.

Onboarding is not a gate. The plan must still include a useful first teaching move immediately.

## Source grounding

Paper reconstruction is limited to supplied source context.

The first slice does not:

- browse the web to repair missing claims;
- silently import outside knowledge;
- fact-check the paper;
- infer unseen figures from a PDF locator;
- treat a paper's claim as learner Evidence.

Research Capability will later provide explicit external verification when a selected teaching move requires it.

## Authority boundary

A `PaperLearningPlan` has no learner-state authority.

It cannot directly:

- create Runtime Evidence;
- promote mastery;
- accept a LearningMap revision;
- complete a Mission.

Prerequisite structure may later become a LearningMap **proposal**. Learner performance during teaching may later become Evidence through the normal Runtime path.

## Server route

The first-party server exposes:

```text
POST /api/learning/paper-plan
```

with a body shaped approximately as:

```json
{
  "turn": {
    "schemaVersion": "0.1",
    "host": { "id": "workspace" },
    "message": "Help me really understand this paper.",
    "references": [
      {
        "id": "paper-1",
        "kind": "file",
        "label": "Paper",
        "excerpt": "resolved source text...",
        "mediaType": "application/pdf"
      }
    ],
    "capabilities": []
  },
  "mode": "auto"
}
```

The route performs no learner-state write.

## Next slice

Issue #95 should use this plan as context for the actual learning loop:

```text
plan
→ natural Teacher turn
→ learner action
→ Runtime Evidence
→ repair / advance
→ Session Close
→ later retrieval / transfer
```

Paper completion must remain capability-based rather than section-coverage-based.
