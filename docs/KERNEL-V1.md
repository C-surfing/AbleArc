# AbleArc Learning Kernel v1

Status: **canonical kernel architecture**  
Date: 2026-09-19

AbleArc's Kernel is the smallest complete set of abstractions required to help a learner actually become more capable over time.

It is not a Web framework, productivity system, agent framework, knowledge-management platform, scheduler, or health tracker. Product surfaces and hosts may change; the learning control logic should remain coherent.

## 1. Kernel objective

Optimize for:

```text
capability_after - capability_before
```

not:

```text
content consumed
time spent
messages exchanged
notes generated
model praise
UI engagement
```

The Kernel should continuously answer:

1. What capability is the learner trying to build?
2. What structure does that capability depend on?
3. What can the learner actually do now?
4. What is uncertain?
5. What is the highest-value cognitive action now?
6. What did the learner actually do?
7. What does that action justify changing?
8. Should the session continue, pause, or close?
9. What should later retrieval or transfer verify?

## 2. Canonical learning loop

```text
MISSION
  ↓
MAP ───────── MODEL
  └─────┬─────┘
        ↓
     CONTEXT
        ↓
      POLICY
        ↓
       MOVE
        ↓
      ACTION
        ↓
   OBSERVATION
        ↓
     EVIDENCE
        ↓
MODEL / FRONTIER UPDATE
        ↓
      PACING
        ↓
continue / pause / close
        ↓
later retrieval / transfer
```

The loop is conceptual. It does **not** require one class, database, service, or receipt type per box.

## 3. Core abstractions

### Mission

A Mission defines an observable capability worth building.

Projects may contain multiple Missions, but only one Mission should normally be active for teaching at a time. Do not build a second recursive goal-tree system when the LearningMap already represents capability dependencies.

### Map

The LearningMap is a **Mission-scoped capability dependency hypothesis**.

It is not:

- a textbook table of contents;
- a universal knowledge graph;
- a personal second-brain graph;
- a UI canvas.

Topology changes conservatively. The frontier may move frequently.

### Model

The learner model represents what current evidence justifies about the learner.

The learner-facing projection remains intentionally coarse:

```text
○ unknown
◔ exposed
◐ developing
● stable
◆ transferable
```

These states are not percentages. Richness belongs in Evidence, not in fake numerical precision.

### Context

Context may include:

- energy;
- focus;
- available minutes;
- explicit learner constraints;
- durable routing preferences;
- source/course context.

Context changes teaching strategy. It does not directly change mastery.

### Policy

Policy chooses how to learn next.

Conceptually it covers:

- Teaching Policy;
- Study Policy;
- Review Policy;
- Session Policy;
- challenge calibration.

Policy should use LLM judgment aggressively where pedagogy is contextual. Deterministic code should guard learner truth, schemas, provenance, and authority rather than trying to encode an expert teacher as a large state machine.

### Move

A Move is one bounded cognitive action with a clear learning purpose.

Examples include explain, retrieve, predict, derive, contrast, apply, repair, and transfer.

A learner-facing turn should normally have one center of gravity.

### Observation

Observation records what actually happened, without interpreting it as mastery.

### Evidence

Evidence interprets learner performance.

Evidence may carry:

- level;
- outcome;
- scaffolding;
- context novelty;
- delay;
- independence;
- failure mode;
- artifact form;
- timestamp/provenance.

Evidence can be useful without forcing a mastery transition.

### Pacing

Session Policy may recommend:

```text
continue
pause
close
```

Pacing is a learning-policy recommendation. Timer state, Pomodoro presets, elapsed time, notifications, and break countdowns belong to Host/UI operational state.

## 4. LLM judgment vs deterministic invariants

### LLM-first judgment

The model should normally judge:

- which valid teaching move is best;
- whether to explain directly or probe;
- which failure interpretation is most plausible;
- how much scaffolding to provide;
- whether current challenge is too low, productive, too high, or still unknown;
- whether a recap is more useful than retrieval in an exceptional case;
- whether a completed cognitive unit is a good stopping point;
- which related idea is worth surfacing;
- how to adapt to learner language, style, source order, and context.

These should not become hard-coded transition tables merely because they can be enumerated.

### Deterministic invariants

Code should enforce rules whose violation would corrupt learning truth or system integrity.

At minimum:

1. **Mastery requires Evidence.**
2. **Self-report is routing context, not mastery Evidence.**
3. **State promotion uses the Runtime authority path.**
4. **Observation and Evidence remain distinct.**
5. **Provider, Host, Research, LearningMaterial, Reflection, timer state, and UI state cannot silently become learner truth.**
6. **Evidence provenance and accepted state decisions remain auditable.**
7. **Completion remains Evidence-gated.**
8. **Malformed/stale/provider-failed operations cannot fabricate progress.**

Retrieval-before-refresh is a strong default policy, not an absolute invariant: learner intent or a concrete pedagogical reason may override it.

## 5. Challenge calibration

Challenge calibration is a first-class Policy interpretation:

```text
unknown
underloaded
productive
overloaded
```

It should be inferred primarily from the quality of learner performance and context, including:

- scaffolding used;
- independence;
- failure mode;
- repeated attempts;
- context novelty;
- quality of explanation;
- whether difficulty comes from the target reasoning or irrelevant friction.

Do not implement a fixed target error rate or a universal numeric difficulty score.

Typical response:

```text
underloaded → remove scaffold / vary context / apply / transfer
productive  → preserve the current challenge
overloaded  → narrow the move / repair prerequisite / scaffold / worked example / pause
unknown     → choose a discriminative next move
```

These are policy priors, not validator allow-lists.

## 6. Retrieval and review

Default strengthening loop:

```text
retrieve
→ diagnose
→ targeted repair if needed
→ retry
→ application
→ transfer
```

Across a meaningful delay, prefer retrieval before replaying the previous explanation unless learner intent or teaching context gives a reason not to.

### Evidence freshness, not mastery decay

Time passing does not prove forgetting.

Do not automatically demote:

```text
stable → developing
```

because evidence is old.

Instead represent whether strong independent evidence is fresh enough to trust for current routing. Stale evidence may generate a Review Candidate; only new learner performance can justify a learner-model change.

### Review selection vs review timing

The Kernel decides **what is worth reviewing**, based on factors such as:

- evidence freshness;
- dependency importance;
- uncertainty;
- previous evidence strength;
- transfer relevance.

A scheduler decides **when to surface it**.

SM-2, FSRS, or another scheduling algorithm may later be used outside learner-truth authority. Scheduler output never becomes mastery Evidence.

## 7. Metacognitive calibration

Keep explicit learner self-report separate from observed capability.

The system may derive lightweight routing interpretations such as:

```text
aligned
possible_overestimate
possible_underestimate
unknown
```

These are ephemeral teaching-policy context, not permanent personality labels and not mastery. They should be derived only when explicit learner self-report is materially relevant to observed performance; otherwise use `unknown`.

Do not persist metacognitive calibration into learner truth. Do not infer it from tone or conversational style, and do not build a psychometric learner profile or numeric confidence score without a demonstrated learning need.

## 8. Session policy and consolidation-aware stopping

A good teacher does not always continue generating content.

Session Policy may recommend pause or close when, for example:

- a meaningful cognitive unit has completed;
- valuable Evidence was just produced and delayed retrieval would be more informative than immediate repetition;
- repeated degraded performance suggests low marginal value from another hard move;
- the learner's stated time/energy constraints make a clean close preferable.

After a long break or across sessions, retrieval/reconstruction is normally preferred before refresh.

The Host may implement timer presets such as 25/5, 50/10, 90/15, Custom, or Adaptive. The timer must serve the cognitive unit rather than interrupt it blindly.

## 9. Supporting layers outside learner truth

### LearningMaterial / Library

A support layer for reusable assets. It may cite Evidence or sources but does not own mastery.

### Research Capability

A bounded source retrieval/verification/comparison capability for the Teacher. It cannot write learner state.

### Tools / execution

Use a tool only when execution, retrieval, or verification can resolve a material uncertainty or create useful learning evidence. Do not execute code merely because the subject is technical.

### Hosts

Web, Agent/Skill, ChatGPT-like assistants, IDE integrations, desktop, and future mobile clients are Hosts.

A Host owns interaction and operational UI state. It must not implement a second Learning Kernel.

## 10. Anti-bloat constitution

Six rules govern future architecture:

1. **LLM first for contextual judgment.** Do not encode teaching taste as a large deterministic state machine.
2. **Code guards truth.** Deterministic rules protect Evidence, authority, provenance, compatibility, and safety boundaries.
3. **One source of learner truth.** UI, Host, Provider, Research, Materials, and Reflection do not create parallel mastery models.
4. **Abstract after repetition.** Do not build a generic framework until multiple real use cases reveal the same abstraction.
5. **Product state is not learning state.** Time, clicks, streaks, notifications, timers, and navigation do not become Evidence.
6. **Every subsystem must earn itself.** A new subsystem must name the concrete learner-visible failure it fixes and the smallest end-to-end slice that can test that claim.

Prefer a small number of stable domain modules, pure policy functions, and explicit schemas over forests of managers, registries, factories, services, and plugins.

A top-level `LearningKernel` facade may compose existing modules, but it must not become a monolithic second Runtime.

## 11. Kernel completion / freeze criterion

Kernel v1 is ready to freeze when both are true:

### Expressive completeness

The existing abstractions can express the full loop:

```text
Mission
→ Map
→ Model
→ Context
→ Policy
→ Move
→ Evidence
→ Update
→ Pacing
→ delayed retrieval / transfer
```

across paper learning, mathematics, programming/agent systems, and conceptual learning without adding domain-specific learner-truth models.

### Longitudinal stability

Real multi-session dogfooding no longer reveals a missing **first-class kernel abstraction**. New needs are usually expressible by composing existing concepts or by adding Host/capability behavior outside the Kernel.

After that point, Kernel changes require explicit architectural justification. Product and distribution work may continue without reopening the learning model.
