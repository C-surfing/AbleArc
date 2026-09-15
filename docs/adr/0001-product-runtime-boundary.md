# ADR 0001: Product and runtime boundary

- Status: Accepted
- Date: 2026-09-15

## Context

`ai4learning` already has a stateful teaching protocol, an append-only local
runtime, agent-facing skills, and a first-party visual Workspace. Treating the
Workspace as a separate tutor would create a second source of learner truth and
couple the project to one model provider.

## Decision

`ai4learning` is a **local-first, stateful learning runtime for AI agents**.
There is one core and two entry points:

```text
Teach / Study skill ─┐
                     ├─ ai4learning runtime and local learner state
Official Workspace ──┘
```

The Teach/Study path uses the host agent's intelligence. The official
Workspace is the reference client and may use an `AgentAdapter`, but provider
transport is outside the core runtime. The first supported transport may be
OpenAI-compatible without making OpenAI-specific concepts part of learner
state, receipts, or teaching policy.

## Invariants

- Local files remain the default source of truth.
- Skills, CLIs, apps, and future model adapters operate on the same runtime
  contracts.
- A client cannot promote mastery by writing a visual projection or chat
  summary.
- Provider credentials never enter `.learning/`, runtime receipts, or version
  control.
- Cross-model portability is supported by the protocol, but is not a reason to
  weaken evidence or authority rules.

## Consequences

- The current Python runtime and receipt chain are evolved rather than
  replaced.
- The Workspace must call high-level runtime operations instead of becoming a
  second state authority.
- Provider integrations remain adapters with explicit capability detection.
- Features that require cloud sync, hosted identity, or provider-specific
  state are deferred until separately justified.

