# ADR 0008: Learning OS product boundary and contextual authority

- Status: Accepted
- Date: 2026-09-17

## Context

The project began as a provider-neutral, local-first learning runtime with two main entry paths: agent skills and the official Workspace. Since ADR 0001, the repository has gained project-scoped runtime receipts, Project lifecycle management, a canonical typed LearningMap, evidence-gated Mission completion, a typed Learning Library, learner-facing state and map proposal review, learner-state replay, and longitudinal review observations.

The technical core is now strong enough that the main product risk has changed. The problem is no longer primarily whether the system can represent learner state correctly. The problem is whether a learner can use the system naturally every day without first understanding runtime concepts such as Teach / Study modes, receipts, proposal types, or graph authority.

At the same time, product ideas such as Today recommendations, energy-aware session shaping, Focus Sessions, Capture, Reflection, and future review scheduling introduce new data that must not be confused with learner mastery.

## Decision

The project adopts a two-layer identity:

```text
                    Learning OS
         first-party learner-facing product
                         │
               Web / API experience
                         │
               Daily Orchestrator
                         │
                         ▼
                 Learning Runtime
                         │
       Mission / Map / Model / Move / Evidence
                         │
                 Learning Engine
         embeddable in Agent / Skill / CLI / API
```

The first-party Web application is promoted from a thin runtime viewer into the reference **Learning OS** product surface. The underlying Runtime remains provider-neutral, local-first, independently usable, and authoritative for learner state.

This ADR extends rather than discards ADR 0001. The Workspace may become richer and more product-oriented, but it still cannot become a second source of learner truth.

## Product entry model

The preferred first-party product flow becomes:

```text
new learner:
minimal Entry → capability goal → Project/Mission → representative attempt

returning learner:
Today → Focus Session → feedback / evidence → Session Close → later return/review
```

Teach / Study / Review remain valid runtime modes, but the learner should not be required to select or understand them before acting. The Daily Orchestrator may select an appropriate mode and move based on accepted learning state and non-authoritative context.

## Data classes

New product data is divided into four classes.

### 1. Learning truth

Examples:

- Mission;
- accepted Evidence;
- accepted learner model;
- canonical LearningMap topology;
- accepted state / map decisions;
- verified completion.

Authority remains with the Runtime and existing guarded paths.

### 2. Learning context

Examples:

- energy;
- available minutes;
- optional focus;
- optional contextual note.

Context may affect move selection, difficulty, scope, or scaffolding. It **must not directly promote or demote mastery**.

### 3. Learner-owned records

Examples:

- Capture Inbox items;
- free-form Reflection;
- explicit learner preferences.

These do not become Evidence merely because they exist.

### 4. Operational product state

Examples:

- timer state;
- current panel;
- temporary draft;
- active Focus Session UI state.

Operational state is not learner truth.

## Daily Orchestrator boundary

The Daily Orchestrator may combine:

```text
mission
accepted learner state
LearningMap
current / delayed Evidence
review signals
DailyContext
available time
learner preferences
```

to propose one primary learner action or session shape.

It is a recommendation and orchestration layer. It has no independent authority to change mastery, rewrite canonical topology, or claim Mission completion.

## Focus Session boundary

Focus Session becomes the primary learner action surface. It may hide most runtime machinery and foreground one bounded cognitive move. Hiding machinery is a presentation choice and does not weaken auditability or authority rules.

## Capture and Reflection boundary

Capture and Reflection are intentionally non-authoritative by default.

```text
Capture != Reflection != LearningMaterial != Evidence
```

An explicit later action may transform or submit learner-owned text into a Runtime-assessed attempt, but no implicit conversion is allowed.

## Authority policy direction

The project will distinguish authority conservatism from interaction friction.

Low-risk updates may eventually be accepted automatically by deterministic Runtime policy when clearly defined and tested. High-impact mastery promotion, policy override, and other meaningful claims remain strongly guarded. LearningMap topology remains proposal-first for learner-facing agents.

Any concrete automatic-acceptance policy requires its own typed rules and tests; this ADR does not itself authorize arbitrary automatic mastery changes.

## Capability model

The learner should normally interact with one coherent Teacher. Research, visualization, practice generation, and future specialist workflows should appear as internal capabilities selected to support the current cognitive move, not as a requirement for the learner to route themselves among many visible agents.

Capabilities may retrieve, synthesize, render, or execute work, but learner-state effects must still pass through the normal Runtime evidence and authority path.

## Local-first and synchronization

Local-first remains the default. Optional synchronization may be added later, but hosted identity or cloud storage must not become prerequisites for the core learning loop.

A future sync layer must not create a second mastery authority.

## Invariants

- The first-party product may become richer without owning learner truth.
- DailyContext may shape a move but cannot directly change mastery.
- Reflection, Capture, time spent, UI activity, and streaks are not Evidence by default.
- Today recommendations are overridable and non-authoritative.
- Focus Session prioritizes one cognitive move rather than exposing every subsystem simultaneously.
- The learner normally sees one Teacher; specialist capabilities remain subordinate to the selected learning move.
- Local files remain a supported source of truth.
- Provider-specific transport remains outside canonical learner-state semantics.
- Existing receipt, evidence, map, completion, and compatibility guarantees remain binding.

## Consequences

- Product navigation will gradually shift from runtime-oriented modes toward Entry, Today, Projects, Review, Capture, Focus Session, Library, Map, and Reflection.
- A typed DailyContext and recommendation contract may be introduced without changing learner-state schemas.
- Capture and Reflection require separate storage contracts from LearningMaterial and Evidence.
- Review scheduling remains evidence-gated; the product may expose descriptive suggestions before a scheduler is validated.
- Future capabilities should be added through a provider-neutral boundary rather than by multiplying visible agents.
- `docs/VNEXT-ROADMAP.md` is the canonical delivery sequence for this stage.

## Relationship to ADR 0001

ADR 0001 remains accepted for its core runtime/provider boundary. This ADR updates the product interpretation: the official Workspace is no longer constrained to remain merely a thin read-first view. It may become the full reference Learning OS, provided all learner-truth writes continue through Runtime authority.
