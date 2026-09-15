# ADR 0002: Workspace, project, and mission scope

- Status: Accepted
- Date: 2026-09-15

## Context

The v0.1 layout has one root `MISSION.md`, `ROADMAP.md`, `STATE.md`, artifact
directory, and runtime ledger. This is sufficient for one learning effort but
cannot safely represent multiple concurrent or archived projects. At the same
time, teaching preferences and stable learner constraints should improve the
experience across projects.

## Decision

The target ownership hierarchy is:

```text
Workspace
├── durable learner memory
└── Projects
    └── Missions
```

Workspace-level memory contains only durable, teaching-relevant learner
preferences, constraints, and repeatedly supported learning patterns.

Mission, learning map, concept state, evidence, misconceptions, reviews,
materials, artifacts, records, and runtime receipts are project-local. A
project may contain multiple missions, with an explicit active mission.

The existing unscoped v0.1 root layout is a supported legacy single-project
format. Project-aware storage must first add a compatibility reader and only
then add an explicit, non-destructive migration.

## Invariants

- Temporary errors and concept mastery never become workspace learner traits
  merely because they occurred in one project.
- Receipt references and accepted state transitions do not cross project
  boundaries.
- A migration cannot rewrite immutable v0.1 receipts in place.
- Failed or partial migration cannot switch the active source of truth.
- Human-readable Markdown remains a projection where a structured authority
  exists.

## Consequences

- Runtime and client operations will require explicit project and, where
  relevant, mission context.
- A compatibility layer is necessary before canonical v0.2 paths can become
  the default.
- Global indexes should be projections that can be rebuilt from project
  manifests, rather than an independent source of project truth.

