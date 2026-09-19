# Learner Profile v1

Status: **workspace-scoped durable self-report implemented**

Learner Profile v1 makes `.learning/LEARNER.md` an inspectable, editable source of durable teaching context without turning it into mastery state or conversation memory.

## What belongs in the profile

The first structured fields cover:

- preferred language and level of detail;
- intuition/formalism balance and Socratic tolerance;
- preferred pace;
- prior exposure;
- self-reported strengths and weaknesses;
- long-term learning goals;
- current courses / source context;
- technical background and tools/languages;
- typical session length;
- recurring learning constraints.

Existing stable reasoning-pattern tables and observations remain valid and are preserved by structured edits.

## What does not belong

Do not store:

- full chat transcripts;
- every temporary question or mistake;
- current concept mastery;
- one-off mood or DailyContext;
- Runtime receipt ids;
- assistant-inferred personality labels;
- speculative strengths or weaknesses the learner did not state.

## Authority

```text
Learner Profile
= durable routing context

Runtime Evidence
= observed learner capability

Learner Profile != mastery
```

A statement such as "I studied linear algebra before, but eigenvalues are weak" may become prior exposure + reported weakness. It must not promote or demote the accepted eigenvalue mastery state by itself.

## Storage

The canonical file remains:

```text
.learning/LEARNER.md
```

v1 adds lightweight metadata comments for optimistic editing:

```text
profile_revision
profile_updated_at
```

Known profile fields are updated in place. Existing unrelated Markdown sections, stable-pattern tables, and observations are preserved.

## Web

The first-party UI exposes:

```text
/profile
```

The learner can inspect and edit the durable fields directly.

The API is:

```text
GET  /api/learner-profile
POST /api/learner-profile
```

Both same-origin Web calls and token-authenticated external assistant hosts use the same store.

## Host integration

The assistant host's `get_learning_state` projection reads the same Learner Profile and returns a bounded profile object alongside current Project state.

Transient `HostTurn.selfReport` remains turn-scoped unless the learner explicitly chooses to persist something through the Learner Profile boundary. The adapter does not automatically copy each conversation into `LEARNER.md`.

## Teacher use

The Teacher should use the profile as a routing prior:

- avoid asking for already-known background repeatedly;
- preserve preferred language/rigor when useful;
- choose examples and tools compatible with the learner's background;
- treat reported weak areas as hypotheses to route around or verify when consequential.

Behavioral Evidence remains the only path to accepted capability state.
