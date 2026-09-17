# DailyContext v0.1

Status: **Phase 2 product contract**

DailyContext represents short-lived conditions that may change **how AbleArc recommends learning today** without changing what the Learning Runtime believes the learner knows.

It exists to separate two questions that must not collapse into one another:

1. **Learner state:** What capability is supported by accepted Evidence?
2. **Daily context:** What kind of session is realistic and useful right now?

## Contract

A persisted context has this logical shape:

```ts
interface DailyContext {
  schemaVersion: "0.1";
  revision: number;
  energy: 1 | 2 | 3 | 4 | 5;
  availableMinutes?: number;
  focus?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  updatedAt: string;
}
```

The context is optional. If it is persisted, `energy` is required; the other learner inputs remain optional.

The v0.1 surface is deliberately small. It does not collect sleep scores, mood diagnoses, productivity metrics, biometrics, or inferred psychological state.

## Storage

DailyContext is local-first and workspace-scoped:

```text
.learning/
└── context/
    └── daily.json
```

The manifest contains the workspace id and an optimistic revision number. Writes use a local lock plus temporary-file rename, and refuse symbolic-link storage paths.

DailyContext is intentionally **outside** every Project's `runtime/` directory. It is contextual product state, not an Evidence receipt and not a learner-state projection.

## Recommendation contract

The Daily recommendation combines the accepted Runtime projection with optional DailyContext. Context may change:

- session length/shape;
- whether the fallback frontier posture is short retrieval, guided attempt, or deeper independent attempt;
- recommendation rationale shown to the learner.

An unanswered Runtime Decision remains the cognitive action. DailyContext may shape the session around that action but cannot silently replace it.

Every recommendation carries this explicit authority surface:

```ts
{
  createEvidence: false,
  changeMastery: false,
  reviseMap: false,
  completeMission: false
}
```

This is not a security token. It is an architectural contract that keeps contextual recommendation code visibly outside learner-truth authority.

## Non-authority invariants

Changing energy, time, focus, or note must never by itself:

- create an Observation or Evidence receipt;
- promote or demote mastery;
- accept a learner-state proposal;
- revise the LearningMap;
- satisfy a Mission completion criterion;
- mark a review as retained;
- fabricate a new domain-specific learner action when a Runtime Decision is already pending.

The Today UI surfaces these limits directly. A learner can inspect why context changed the recommended session shape while Runtime-backed evidence remains separate.

## Phase boundary

DailyContext v0.1 is sufficient for Phase 2 when real dogfooding shows that context changes the usefulness of session recommendations without weakening the authority model.

It does **not** add scheduling, notifications, calendar integration, automatic energy inference, or mastery heuristics. Those remain deferred until later roadmap gates justify them.
