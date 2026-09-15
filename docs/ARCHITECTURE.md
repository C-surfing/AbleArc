# Architecture

`ai4learning` is a small adaptive tutoring protocol. Its architecture is deliberately centered on **learner state and teaching decisions**, not on content generation.

## Core abstraction

Every meaningful turn can be reduced to four objects:

```text
MAP      Where could the learner go?
MODEL    What does the learner currently understand?
MOVE     What is the best next cognitive action?
EVIDENCE Did the move work?
```

The control problem is:

```text
move* = f(mission, learner_model, knowledge_map, current_evidence, constraints)
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

The protocol therefore separates **authority** from **projection**:

- the learner model is the operational authority for teaching decisions;
- chat prose, quiz results, notes, diagrams, and generated references are evidence or projections;
- one isolated answer should not silently overwrite the learner model.

## State layers

### Mission layer

`MISSION.md` answers: *what capability is worth building?*

It prevents the tutor from optimizing generic subject coverage when the learner actually needs a narrower or different capability.

### Durable learner layer

`LEARNER.md` captures stable learner-specific information. This lets one teaching interface adapt across subjects without mixing temporary errors into identity-like preferences.

### Knowledge-map layer

`ROADMAP.md` describes concept dependencies and the learner's status on those nodes. It provides global orientation while allowing local teaching.

The roadmap is not authoritative curriculum. It is revised as teaching produces new evidence.

### Operational state layer

`STATE.md` is optimized for one question: **what should happen next?**

It therefore stores frontier, misconception, evidence, open questions, and next move rather than a narrative history.

### Learning records

`records/` is sparse human-readable history. It exists for meaningful state transitions, not every session. `.learning/runtime/receipts/` is the machine-operable, append-only transaction ledger; `.learning/runtime/state.json` is its accepted concept-state projection.

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

The key invariant is not which move occurs; it is that the move is selected from current learner state and produces evidence useful for the next update.

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

## Optional future modules

The protocol is designed so these can be added without changing its core semantics:

- spaced-retrieval scheduler;
- richer learning-record schema;
- concept graph visualization;
- automatic source/research subagent;
- interactive quiz UI;
- notebook / Obsidian integration;
- course import;
- analytics over evidence trajectories;
- cross-agent state synchronization.

None of these should become necessary for the core teaching loop to work.
