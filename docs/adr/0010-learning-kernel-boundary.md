# ADR 0010 — Learning Kernel Boundary and Judgment Policy

Status: Accepted  
Date: 2026-09-19

## Context

AbleArc has accumulated a rigorous Runtime plus useful first-party product slices. The next risk is no longer missing features; it is architectural drift:

- product concerns may leak into learner truth;
- every teaching heuristic may become deterministic code;
- generic frameworks may appear before repeated use justifies them;
- review timing, timers, research, or materials may grow into parallel learning engines;
- the project may optimize implementation completeness instead of learner capability delta.

Recent design review therefore moved near-term priority from product expansion to completing and freezing a small Learning Kernel.

## Decision

AbleArc defines a **Learning Kernel** as the bottom-level learning control abstraction:

```text
Mission
→ Map + Model
→ Context
→ Policy
→ Move
→ learner Action
→ Observation
→ Evidence
→ Model / frontier update
→ Pacing
→ delayed retrieval / transfer
```

The conceptual loop does not imply one implementation object per step.

### LLM judgment is the default for contextual pedagogy

The Teacher/LLM should normally judge:

- which teaching move is appropriate;
- how to respond to a diagnosed failure;
- how much scaffolding to reveal;
- challenge level;
- whether to explain, probe, retrieve, contrast, repair, or transfer;
- whether a session should continue, pause, or close;
- when learner intent justifies overriding a default such as retrieval-before-refresh.

These decisions may be strongly prompted and structured, but should not become validator allow-lists unless a concrete integrity requirement demands it.

### Deterministic code protects learner truth

Hard invariants are reserved for boundaries whose violation would corrupt state or provenance.

Examples:

- mastery requires Evidence;
- self-report is not mastery Evidence;
- Observation is distinct from Evidence;
- state promotion uses Runtime authority;
- Completion is Evidence-gated;
- Provider/Host/Research/Material/Reflection/UI/timer state cannot silently write mastery;
- stale or malformed operations cannot fabricate progress;
- accepted history remains auditable.

### Failure diagnosis remains structured; intervention choice is not hard-gated

`failure_mode` remains a useful structured assessment because it changes teaching decisions.

However, mappings such as:

```text
wrong_causal_model → {contrast, prediction, derive, repair}
```

are teaching priors, not exhaustive validity rules.

A pedagogically justified move outside a hand-maintained list must not be rejected solely by a deterministic validator.

### Challenge calibration

Challenge becomes a Policy interpretation:

```text
unknown | underloaded | productive | overloaded
```

Do not encode a universal target error rate or numeric difficulty score.

### Evidence freshness

Elapsed time may make Evidence stale for routing/review purposes but does not itself demote mastery. New performance Evidence is required for learner-model change.

### Review

The Kernel decides what deserves re-verification. Scheduling algorithms decide when to surface it. FSRS/SM-2 or other timing algorithms remain outside mastery authority.

### Session pacing

The Kernel may recommend `continue / pause / close`.

Timers, Pomodoro presets, countdowns, and notifications are Host/UI operational state and cannot become Evidence.

### Anti-bloat rule

New generic abstractions should normally be extracted only after multiple real use cases reveal the same structure.

A subsystem must identify the learner-visible failure it solves and remain in the smallest layer that can solve it.

## Consequences

- The current product surfaces remain valid but product/UI expansion is temporarily subordinate to Kernel v1 work.
- Existing Runtime receipt and authority semantics remain intact.
- Teaching code should become less mechanically restrictive where no learner-truth invariant is at stake.
- A thin `LearningKernel` facade composes state inspection and one-turn advance over existing modules; it does not duplicate Runtime or own persistence.
- Product integrations can evolve independently as Hosts over the same Kernel.
- Kernel v1 should eventually be frozen after longitudinal evidence shows no missing first-class abstraction.

## Non-goals

This ADR does not:

- remove structured teaching outputs;
- remove failure-mode diagnosis;
- weaken Evidence requirements;
- make the LLM authoritative over learner state;
- mandate a specific model provider;
- introduce a scheduler;
- implement Pomodoro UX;
- add health/sleep/caffeine tracking;
- require a repository-wide rewrite.
