# Paper Learning v1

Status: **entry planning + Mission context wiring + evidence-gated completion profile implemented**

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

After a successful grounded plan, the server now:

1. verifies that the HostTurn matches the selected active Project/Mission;
2. persists only the validated structured plan to the Mission as `paper-learning.json` — not the full transcript or resolved source text;
3. installs the standard paper completion profile when the Mission has no conflicting custom completion contract;
4. preserves a pre-existing custom completion contract instead of silently replacing it.

The persisted plan is non-authoritative teaching context. It can shape later Teacher turns but cannot create Evidence or mastery.

## Evidence-bearing learning loop

Paper Learning reuses the normal Runtime turn path:

```text
plan
→ natural Teacher turn
→ learner action
→ Observation / Runtime Evidence
→ repair / advance
→ Session Close / Tomorrow Seed
→ later retrieval / transfer
```

The paper layer does not introduce a second assessment protocol. Existing Teacher Policy, failure-mode diagnosis, state authority, and Session Close behavior remain in force.

## Paper completion profile

`apps/workspace/lib/paper-completion.ts` maps the paper Mission onto six required capabilities:

1. reconstruct the paper's problem, importance, and motivating gap;
2. explain the core idea and method/mechanism;
3. connect claims to reported evidence and state what that evidence does not establish;
4. identify assumptions, limitations, and meaningful boundaries;
5. reconstruct the central argument after a delay without replaying the paper;
6. transfer the paper's argument/evidence reasoning to a neighboring paper, experiment, or problem.

The last two requirements prevent "I just read it and can paraphrase it" from counting as verified completion.

These capabilities are ordinary Mission Completion criteria. They reuse existing Runtime dimensions such as explanation/application/transfer level, scaffolding, context, delay, and independence.

The first-party Completion API accepts:

```text
action: configure-paper
```

to install or refresh this profile through the existing `criteria-set` authority path. Evidence links may be attached explicitly to the relevant paper criterion; existing cited links are preserved when the profile is refreshed.

The ordinary Completion Gate remains authoritative. Paper completion does not add a parallel mastery score.

## User-visible progress

When the selected Mission uses the complete paper profile, the existing Completion Gate additionally summarizes:

```text
Paper understanding: passed / required
delayed retrieval: verified | pending
transfer: verified | pending
```

This is a projection of accepted Runtime Evidence, not section coverage or model confidence.

## First-party Web entry

The local Workspace exposes:

```text
/paper
```

for the selected active Project/Mission.

The first slice intentionally supports **pasted extracted text** rather than building a file-upload/parser subsystem. The learner can:

- label the source;
- choose `auto`, `follow_source`, or `understanding_first`;
- paste up to 80k characters of paper/section text;
- generate or replace the Mission-scoped paper plan;
- reopen the persisted plan in a later session;
- continue into Focus from the plan's first move.

The pasted source body is sent to the planner for that request and is not persisted by Paper Learning. Only the validated structured plan and source-reference IDs are retained.

PDF extraction, OCR, remote retrieval, and attachment resolution remain host/capability concerns rather than responsibilities of the Paper Learning UI.

## Teacher continuity

The Workspace Teacher advance path reads the same Mission-scoped paper context together with the workspace Learner Profile. This lets later turns retain the paper's problem → claim → method → evidence → limitation structure without replaying the full source or storing the host transcript.

Exact source verification still requires the original resolved reference or Research Capability; a persisted plan is not a substitute for checking source text.

## Next slice

The implementation wiring is complete. The remaining gate is real longitudinal paper-first dogfooding across multiple sessions, including resumption, delayed retrieval, and transfer.
