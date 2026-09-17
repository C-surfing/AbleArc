# ADR 0007: Review LearningMap topology proposals before canonical revision

- Status: Accepted and implemented
- Date: 2026-09-17

## Context

ADR 0003 separates the canonical LearningMap topology from accepted learner
mastery. The agent write path can already submit an evidence-grounded full map
through the canonical revision writer, but the product needs a learner-facing
way to inspect consequential topology/frontier changes before they become the
current route.

Treating a React click as direct graph editing would collapse the authority
boundary. Treating an agent proposal as already accepted would make topology
automation stronger than the learner-facing review surface.

## Decision

A proposed topology change is a separate immutable object:

```text
project-local Evidence
        ↓
LearningMapProposal @ base revision N
        ↓
learner inspect + rationale
        ↓
accept / reject decision
        ↓ accepted only
canonical LearningMap revision N+1
```

A proposal stores the complete candidate topology/frontier, its rationale,
project-local Evidence references, the base LearningMap revision, and the
computed structural delta. It does not replace `map/current.json`.

Acceptance is guarded by the canonical LearningMap write lock and reuses the
same node, edge, frontier, Evidence, lifecycle, delta, and revision validators.
The base revision must still be current. A stale proposal can be rejected but
cannot overwrite a newer topology hypothesis.

A learner decision is immutable and records the learner's rationale. Rejection
never mutates the canonical map.

## Invariants

- A proposal has no mastery, Evidence, Completion, or review-scheduling authority.
- Creating or viewing a proposal cannot mutate `map/current.json`.
- Accepting a proposal changes topology/frontier only; it cannot change accepted mastery.
- State-proposal acceptance cannot silently accept a LearningMap proposal.
- LearningMap proposal acceptance cannot silently accept a state proposal.
- Proposal Evidence stays within the selected Workspace/Project.
- Acceptance fails closed when the canonical base revision has changed.
- One proposal receives at most one immutable learner decision.
- Pixel layout and node selection remain disposable UI state.

## Storage

For workspace-v0.2 Projects:

```text
.learning/projects/<project-id>/map/
├── current.json
├── revisions/
├── proposals/<proposal-id>.json
└── proposal-decisions/<proposal-id>.json
```

Proposal and decision records are review/audit objects. `current.json` and its
append-only revision history remain the canonical topology authority.

## Consequences

The Workspace can show a human-readable before/delta/after decision surface
without giving React graph-edit authority. Agents may propose structural
changes, but the learner can see the claimed rationale, Evidence count,
frontier change, and node/edge delta before deciding.

This ADR does not authorize free-form graph editing, automatic proposal
acceptance, mastery changes, or a scheduler.
