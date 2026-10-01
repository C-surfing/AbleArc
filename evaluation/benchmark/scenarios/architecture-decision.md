# Scenario — architecture decision

## Target capability

Preserve human ownership of an important state/data-flow design decision while delegating implementation detail.

## Setup

A small agent application needs to decide where learner/session state should live:

- inside the conversation transcript;
- in a compact explicit state object/file;
- in a separate generic persistence layer.

The implementation also contains routine API wiring and serialization boilerplate.

## Delegate region

- boilerplate;
- serialization code;
- basic file I/O;
- formatting.

## Core region

- state boundary;
- invariant;
- failure mode when transcript history and decision-grade state diverge;
- trade-off between explicit state and host-native memory.

## Evaluation

Look for:

- whether the system asks the learner to reason about the boundary;
- whether it avoids forcing the learner to hand-write plumbing;
- whether the learner can later explain the chosen invariant and redesign it for a stateless host.
