# ADR 0007: Review LearningMap topology proposals before canonical revision

- Status: Accepted and implemented
- Date: 2026-09-17

## Context

ADR 0003 separates the canonical LearningMap topology from accepted learner
mastery. The canonical revision writer can already accept an evidence-grounded
full map, but the product needs a learner-facing way to inspect consequential
topology/frontier changes before they become the current route.

Treating a React click as direct graph editing would collapse the authority
boundary. Treating an agent proposal as already accepted would make topology
automation stronger than the learner-facing review surface. Leaving the Teach
agent free to call the direct writer during ordinary learner-facing operation
would create the same bypass through a different interface.

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

For learner-facing Teach operation, proposal-first is mandatory: when an agent
believes Evidence changes topology or the frontier, it creates a
LearningMapProposal and leaves accept/reject authority to the learner review
path. The direct canonical `map-update` writer remains available only for an
explicit trusted/headless context such as controlled maintenance, tests, or a
local operator workflow where learner-facing review is intentionally absent.
It is not a normal Teach-agent shortcut.

Acceptance is guarded by the canonical LearningMap write lock and reuses the
same node, edge, frontier, Evidence, lifecycle, delta, and revision validators.
The base revision must still be current. A stale proposal can be rejected but
cannot overwrite a newer topology hypothesis.

A learner decision is immutable and records the learner's rationale. Rejection
never mutates the canonical map.

## Invariants

- A proposal has no mastery, Evidence, Completion, or review-scheduling authority.
- Creating or viewing a proposal cannot mutate `map/current.json`.
- A learner-facing Teach agent must propose topology/frontier changes rather than directly call the canonical writer.
- Direct `map-update` is reserved for an explicit trusted/headless operation and must not be used to bypass learner review.
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

The operational Teach protocol now follows the same boundary instead of
silently preferring the lower-level canonical writer. This costs one explicit
review step for learner-facing topology changes, but it preserves the learner's
authority over route revisions and makes stale/conflicting proposals observable.

This ADR does not authorize free-form graph editing, automatic proposal
acceptance, mastery changes, or a scheduler.
