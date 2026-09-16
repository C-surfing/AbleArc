# ADR 0003: Separate LearningMap topology and learner overlay

- Status: Accepted and implemented
- Date: 2026-09-15

## Context

The v0.1 Markdown roadmap and `RoadmapNode` view model combine an inferred
domain dependency graph with the learner's current mastery state. This makes a
roadmap revision easy to confuse with a state change and leaves layout choices
inside presentation code.

## Decision

The canonical LearningMap stores a revisable **topology hypothesis**:

- typed nodes (`concept`, `procedure`, or `strategy`);
- semantic edges;
- mission relevance;
- current frontier;
- revision parent, rationale, evidence references, and structural delta.

Accepted concept mastery remains in the runtime state projection derived from
the receipt chain. A Workspace snapshot joins topology with this learner
overlay for display.

Layout is not part of the LearningMap contract. Agents define semantic
relationships; a deterministic layout engine chooses positions; React Flow
renders and provides interaction.

## Invariants

- Editing topology cannot change accepted mastery.
- Accepting a state proposal cannot silently rewrite topology.
- A roadmap revision is append-only and explains why structure changed.
- Pixel coordinates are disposable, rebuildable presentation data.
- `ROADMAP.md` remains a human-readable projection, not the canonical graph.
- Misconceptions remain separate objects rather than a node mastery state.

## Consequences

- The former single `dependsOn` view field is replaced by explicit edge
  objects.
- The UI can provide dependency, mastery, evidence, mission, and review lenses
  over the same topology without duplicating authority.
- ELK now derives a deterministic layered layout without changing the
  LearningMap schema.

The implementation contract and agent write path are documented in
[`../LEARNING-MAP.md`](../LEARNING-MAP.md).
