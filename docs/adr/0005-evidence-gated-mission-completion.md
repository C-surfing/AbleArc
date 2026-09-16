# ADR 0005: Mission completion is an evidence-gated transition

- Status: Accepted
- Date: 2026-09-16

## Context

A Project can be archived for administrative reasons, but Archive alone does
not establish that the learner reached independent performance. Likewise, a
single immediate answer can look fluent while hiding borrowed language,
scaffolding dependence, or failure to apply the model.

## Decision

Verified Mission completion requires declared criteria evaluated against
Mission-local Runtime Evidence. Every gate requires a Feynman reconstruction
and an independent performance criterion, supported by distinct receipts.

On success the Runtime writes an immutable completion record, completes the
Mission, and archives the retained Project with maintenance scheduled. The
manual Archive transition remains available but carries no completion claim.

## Consequences

- Evidence interpretation remains with the Agent/Runtime assessment path; the
  gate only checks structured dimensions.
- Completion cannot be inferred from UI telemetry, prose praise, mastery state
  alone, or evidence from another Project.
- Criteria can evolve while learning is active, then are frozen in the
  completion record for audit.
- Archive remains reversible for maintenance and never deletes learning state.
- A scheduler may later decide when to re-check retention, without changing
  what qualified the original completion.
