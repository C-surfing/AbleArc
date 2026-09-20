# Architecture

AbleArc is an evidence-driven learning system centered on **learner capability, learning decisions, and trustworthy state**, not on content generation or product engagement.

The canonical Kernel boundary is defined in [`KERNEL-V1.md`](KERNEL-V1.md) and ADR [`0010`](adr/0010-learning-kernel-boundary.md). Product/UI delivery is currently subordinate to Kernel completion; see [`KERNEL-FIRST-ROADMAP.md`](KERNEL-FIRST-ROADMAP.md).

## Core abstraction

The compact mental model remains:

```text
MAP       Where could the learner go?
MODEL     What does the learner currently understand?
MOVE      What is the best next cognitive action?
EVIDENCE  Did the move work?
```

Kernel v1 expands that into a complete learning-control loop without requiring a separate subsystem for every box:

```text
MISSION
  ↓
MAP + MODEL
  ↓
CONTEXT
  ↓
POLICY
  ↓
MOVE
  ↓
LEARNER ACTION
  ↓
OBSERVATION
  ↓
EVIDENCE
  ↓
MODEL / FRONTIER UPDATE
  ↓
PACING: continue / pause / close
  ↓
later retrieval / transfer
```

The control problem remains:

```text
move* = f(mission, learner_model, knowledge_map, current_evidence, context)
```

and after learner action:

```text
learner_model(t+1) = update(learner_model(t), observed_evidence)
```

The executable runtime expands that conceptual loop into an auditable transaction:

```text
DecisionProposal
  → Observation
  → EvidenceReceipt
  → StateProposal
  → explicit authority decision
  → accepted state projection
  → TurnReceipt
```

See [`RUNTIME-CONTRACT.md`](RUNTIME-CONTRACT.md) for the receipt schema and transition guardrails.

Hosts integrate with this control loop through a thin composition boundary:

```text
Host
  ↓
inspectLearningKernel
advanceLearningKernelTurn
  ↓
existing domain modules
  ↓
Runtime authority + persistence
```

The facade does not own learner state. It removes Host-specific orchestration glue while keeping Provider selection, HTTP/authentication, UI state, and presentation outside the Kernel.

### Host reliability and partial-success boundary

A Host must represent the learning transaction honestly when only part of it succeeds. In particular, a learner Observation may be durably saved even when Provider assessment fails. The correct recovery model is:

```text
learner response
  → Observation saved
  → Provider assessment attempt
      ├─ succeeds → Evidence / next Decision / optional StateProposal
      └─ fails    → preserve Observation + expose retryable Host state
```

Retry counters, pending indicators, latency, provider diagnostics, and error banners are Host operational state. They do not enter learner truth.

The Web Host must also complete the same learner-state authority path as other Hosts when an assessment justifies a state change:

```text
Evidence
  → Runtime-derived conservative candidate StateProposal
  → risk / transition-policy inspection
      ├─ low-risk unknown → exposed → runtime_policy may accept
      └─ stronger claim → explicit learner/human review
  → accepted state projection
```

The Provider supplies assessment Evidence; it does not choose accepted mastery. The Runtime may deterministically derive a candidate from validated Evidence, but candidate creation and acceptance remain separate. React state never writes mastery. Inconclusive Evidence and ordinary contradictions may remain evidence-only without any state transition. Projection code must fail closed: template text, prose substrings, internal identifiers, and formatting artifacts are not learner Evidence or mastery.

See [`WEB-STABILIZATION-2026-09-20.md`](WEB-STABILIZATION-2026-09-20.md).

The protocol therefore separates **authority** from **projection**:

- the learner model is the operational authority for teaching decisions;
- chat prose, quiz results, notes, diagrams, and generated references are evidence or projections;
- one isolated answer should not silently overwrite the learner model.

## State layers

### Mission layer

`MISSION.md` answers: *what capability is worth building?*

It prevents the tutor from optimizing generic subject coverage when the learner actually needs a narrower or different capability.

Mission completion has its own authority boundary. Structured criteria cite
Mission-local Runtime Evidence; a deterministic gate requires both Feynman
reconstruction and independent performance from distinct receipts before it
can write an immutable completion record. Manual Archive remains a storage
transition, not a mastery claim. See
[`MISSION-COMPLETION.md`](MISSION-COMPLETION.md).

### Durable learner layer

`LEARNER.md` captures stable learner-specific information. This lets one teaching interface adapt across subjects without mixing temporary errors into identity-like preferences.

### Knowledge-map layer

In workspace-v0.2, `map/current.json` describes typed concepts, procedures,
strategies, explicit dependencies, and the current frontier. `ROADMAP.md` is its
human-readable projection. Accepted node mastery stays in
`runtime/state.json`; the Workspace joins the two layers for display.

The roadmap is not authoritative curriculum. It is revised as teaching produces new evidence.
See [`LEARNING-MAP.md`](LEARNING-MAP.md) for its evidence-grounded write path.

### Operational state layer

`STATE.md` is optimized for one question: **what should happen next?**

It therefore stores frontier, misconception, evidence, open questions, and next move rather than a narrative history.

### Learning records

`records/` is sparse human-readable history. It exists for meaningful state transitions, not every session. `.learning/runtime/receipts/` is the machine-operable, append-only transaction ledger; `.learning/runtime/state.json` is its accepted concept-state projection.

### Learning Library

`materials/` stores typed, immutable knowledge assets that are worth returning
to: derivations, worked examples, source notes, code, diagrams, misconception
repairs, and verified Feynman explanations. Every material says why it should
be revisited and cites Runtime Evidence or a source. Materials remain
projections, never learner-state or completion authority. See
[`LEARNING-LIBRARY.md`](LEARNING-LIBRARY.md).

## Concept-state model

The visible roadmap uses five coarse states:

```text
○ unknown
◔ exposed
◐ developing
● stable
◆ transferable
```

These are intentionally not percentages. False numerical precision invites bad model updates.

Suggested interpretation:

- `unknown`: no useful evidence of understanding;
- `exposed`: encountered or recognized but not independently usable;
- `developing`: some independent reasoning exists but remains brittle, partial, or cue-dependent;
- `stable`: can recall/explain/apply with reasonable independence across time or multiple contexts;
- `transferable`: recognizes the underlying structure and successfully uses it in an unfamiliar but related context.

## Evidence model

Evidence has strength and context. The default ordering is:

```text
recognition < recall < explanation < application < transfer
```

This is not a universal psychometric scale; it is an operational heuristic for avoiding premature mastery claims.

Evidence should also track whether it was:

- immediate or delayed;
- cued or uncued;
- representative or novel;
- independent or heavily scaffolded;
- isolated or repeated.

State changes should be conservative. A correct answer can update evidence without forcing a state transition.

## Misconception model

A misconception is not merely a wrong answer. It is a **generative model that systematically predicts wrong answers**.

Store misconceptions only when evidence suggests a model-level error. Useful fields are:

```text
belief/model
confidence
supporting evidence
counter-evidence
repair status
```

Repair should target the smallest structural error that explains the observed failures.

## Teaching move taxonomy

The protocol does not hard-code a fixed lesson pipeline. It chooses among move types:

```text
orient
probe
motivate
establish intuition
name/formalize
connect
contrast
derive
worked example
prediction
practice
retrieve
repair misconception
apply
generalize
transfer
compress/reference
```

The move taxonomy is a vocabulary for LLM judgment, not a deterministic lesson state machine. The important invariant is that learner-truth updates remain evidence-grounded; contextual teaching choices should stay flexible unless a concrete integrity boundary requires hard validation.

## Probe design

A probe has positive expected value only when its possible answers lead to different teaching actions.

Informally:

```text
useful_probe ≈ information_gain × decision_relevance / interaction_cost
```

This is why a single discriminative question is often better than a five-question diagnostic block.

## Roadmap construction

A roadmap should include only enough structure to guide learning decisions. Prefer semantic dependencies such as:

```text
conditional probability
        ↓
Bayes rule
        ↓
posterior reasoning
```

over publication order or textbook chapter order.

Each node may carry:

- learner state;
- dependencies;
- what it unlocks;
- mission relevance;
- evidence;
- optional notes about alternate routes.

## Natural interaction layer

The architecture has a strict separation:

```text
internal control system = explicit and stateful
external learner experience = conversational and low-friction
```

The agent should not repeatedly expose machinery such as `Phase 1: Probe`. The learner should normally experience motivation, one useful idea, a meaningful action, and feedback.

## Acquisition vs strengthening

Teach and study share one state model but use different priors.

### Acquisition prior

```text
orient → locate frontier → construct/repair model → verify
```

### Strengthening prior

```text
retrieve → diagnose → targeted repair → apply/interleave → transfer
```

This avoids the common failure where review becomes another lecture.

## Source architecture

Source grounding is separated from learner interaction:

```text
sources
  ↓
verification / synthesis
  ↓
teaching decision
  ↓
learner-facing explanation
```

The learner should not pay the switching cost of source navigation unless the source itself is pedagogically valuable.

## Supporting / optional modules

These may be added around the Kernel when real use earns them. They must not become necessary for learner-truth semantics:

- spaced-retrieval scheduler such as FSRS/SM-2 timing over Kernel-selected review targets;
- richer learning-record schema;
- concept graph visualization;
- automatic source/research subagent;
- interactive quiz UI;
- notebook / Obsidian integration;
- course import;
- analytics over evidence trajectories;
- cross-agent state synchronization.

None of these should become necessary for the core teaching loop to work.
