# vNext Product and Development Roadmap

Status: **implemented product roadmap / subordinate delivery reference**  
Last updated: 2026-09-19

> **Current priority override:** Kernel v1 consolidation now controls near-term development. See [`KERNEL-V1.md`](KERNEL-V1.md), [`KERNEL-FIRST-ROADMAP.md`](KERNEL-FIRST-ROADMAP.md), and ADR 0010. The product architecture in this document remains valid, but its product-first delivery ordering is no longer canonical until the Kernel v1 freeze gate is reached.

This document remains the product and implementation history/reference for the post-v0.2 Learning OS stage. It complements the accepted ADRs and supersedes older backlog ordering where those documents conflict with the priorities below. Existing runtime, evidence, authority, storage, and compatibility guarantees remain binding unless a later ADR explicitly changes them.

The project has reached a transition point. The first stage proved that a rigorous learning runtime can exist: Mission, learner model, typed LearningMap, evidence receipts, state proposals, completion gating, Learning Library, project lifecycle, proposal review, learner-state replay, and longitudinal review observations are implemented. The next stage is not primarily about adding more internal subsystems. It is about turning that learning engine into a product a learner can open every day, enter quickly, focus inside, leave cleanly, and return to with continuity.

---

## 1. Product thesis

The project is evolving into two layers that must remain separable:

```text
                    Learning OS
         first-party learner-facing product
                         │
               Web / API experience
                         │
               Daily Orchestrator
                         │
        ┌────────────────┼────────────────┐
        │                │                │
      Teach            Study            Review
        │                │                │
        └────────────────┼────────────────┘
                         │
                 Learning Runtime
                         │
       Mission / Map / Model / Move / Evidence
                         │
                  authority boundary
                         │
                 Learning Engine
         embeddable in Agent / Skill / CLI / API
```

The product is therefore both:

1. a **personal Learning OS** for a learner's daily study loop; and
2. an **evidence-driven Learning Engine** that other agents, skills, and applications can embed.

The first-party Web product must be excellent, but no Web-only representation, UI state, model provider, timer, dashboard, or cloud service may become the source of learner truth.

### Core promise

The system should continuously answer:

- What am I trying to become able to do?
- What can I actually do now?
- Where is the current frontier?
- What is the highest-value cognitive action I can take next?
- What evidence shows whether that action worked?
- What should I revisit later?

The target remains **capability delta**, not information delivered, time spent, content consumed, or interface engagement.

---

## 2. Product principles

All future work should be evaluated against these principles.

### 2.1 Build a system, not a pile of productivity features

Sleep, energy, focus, planning, review, reflection, and knowledge management are relevant only when they improve learning decisions or continuity. The product must not become a general life OS, habit tracker, health app, Notion clone, task manager, or Pomodoro timer.

The relevant scope is:

```text
learning
+ focus / energy context that changes learning decisions
+ continuity mechanisms that keep learning moving
```

Everything else requires separate evidence and justification.

### 2.2 Manage cognitive energy, not merely time

Available time is not sufficient context for selecting a learning move. The system may use lightweight, learner-provided context such as energy, focus, and available minutes to alter the type, difficulty, scope, or scaffolding of a move.

Context may influence teaching policy. It may **not** directly change mastery.

### 2.3 One important cognitive move at a time

A learner-facing session should normally foreground one bounded, actionable move rather than a generic task list.

A useful move should be:

```text
clear
bounded
observable
answerable now
evidence-producing
```

Examples:

- weak: "study backpropagation"
- better: "derive why the previous layer activation appears in ∂L/∂W without looking at notes"

### 2.4 Preserve the learner's moment of discovery

The existing teaching principle remains central:

> Never steal the learner's moment of discovery.

The system may explain directly when appropriate, but it should not replace a useful learner inference, retrieval, derivation, prediction, application, or transfer attempt with unnecessary exposition.

### 2.5 Active learning before passive delivery

Teaching surfaces should be designed around learner action:

```text
learn / orient
→ attempt
→ feedback
→ adjust
→ attempt again
→ delayed retrieval
→ transfer
```

Content generation is subordinate to this loop.

### 2.6 Evidence before confidence

Learner state must continue to be grounded in behavior and explicit evidence. Self-report, reflections, time spent, page views, streaks, UI interactions, and model praise are not mastery evidence by default.

### 2.7 Authority-conservative does not mean confirmation-heavy

The project must preserve strict authority boundaries without forcing the learner to approve every low-risk internal update.

Future state policy should distinguish:

- append-only evidence or descriptive metadata;
- low-risk state updates;
- meaningful mastery promotion;
- high-impact or policy-override transitions.

Low-risk transitions may eventually be accepted automatically by deterministic policy. Stable / transferable promotion, policy override, and structurally meaningful claims remain more strongly guarded.

LearningMap topology remains proposal-first in the learner-facing product unless a later ADR explicitly changes that boundary.

### 2.8 Keep transient conversation separate from curated knowledge

Conversation context, temporary notes, learner-provided references, Learning Library materials, Evidence, and Reflection serve different purposes.

```text
conversation context != LearningMaterial != Evidence != Reflection
```

Do not create a separate Capture subsystem by default. A learner should be able to state a temporary thought, constraint, or reference naturally in the current host conversation. Promote something into a durable material or learner-owned record only through an explicit action with clear future value.

### 2.9 Reflection belongs to the learner

Reflection is optional, free-form, and learner-owned. The product must not force reflection at session boundaries or at fixed times.

A reflection does not become Evidence unless the learner explicitly turns it into an assessed attempt or the system creates a separate evidence-bearing action from it.

### 2.10 Motivation should show capability growth, not artificial points

Default motivation mechanisms:

- meaningful milestones;
- capability delta;
- visible evidence of increased independence;
- continuity across sessions.

Do not add XP, coins, streak pressure, leaderboards, arbitrary levels, or rainbow progress bars as default product mechanics.

### 2.11 Product complexity must be earned

Before adding a subsystem, answer:

1. Which learner-visible action or continuity failure does it improve?
2. What is the smallest end-to-end slice that tests that claim?
3. What evidence would justify keeping, changing, or removing it?

This remains the architecture budget.

---

## 3. Canonical data and authority model

The next product layer introduces new daily-use data, but it must not blur existing authority.

### 3.1 Learning truth

Authoritative or authority-mediated learning state:

- Mission and completion criteria;
- accepted learner model;
- accepted Evidence;
- misconceptions that affect teaching decisions;
- canonical LearningMap topology;
- accepted state / map decisions;
- immutable runtime receipts;
- verified Mission completion.

This remains owned by the Runtime and its explicit authority paths.

### 3.2 Learning context

Non-authoritative context that may shape the next move:

```text
DailyContext
- energy
- available minutes
- optional focus
- optional free-form note
```

Future fields such as sleep, exercise, environment, or stress must be added only if repeated real use shows they improve learning decisions.

Rules:

- context is optional;
- context can change recommendation strategy;
- context does not lower or raise mastery directly;
- missing context must not block study;
- context should avoid medical interpretation.

### 3.3 Learner-owned records

Examples:

- Reflection;
- explicit preferences;
- manual Project priorities.

These remain distinct from Runtime Evidence unless explicitly promoted through a learning action.

### 3.4 Operational product state

Examples:

- timer state;
- active Focus Session UI state;
- selected tab;
- temporary draft;
- expanded panels;
- client navigation.

Operational state must never become learner truth merely because it exists.

---

## 4. Product information architecture

The first-party product should gradually move from runtime-oriented top navigation to learner-oriented navigation.

Target top-level structure:

```text
Entry
  ↓
Today
├── Projects
├── Review
└── Settings / optional context

Project
├── Focus Session / Learning Canvas
├── Map
├── Library
└── Reflection
```

Teach / Study / Review remain valid runtime modes, but they should increasingly be internal learning modes selected by the orchestrator rather than requiring the learner to understand the runtime taxonomy before acting.

### 4.1 Entry

For a new or uninitialized learner, the first screen should be visually minimal and ask one primary question:

> What do you want to learn or become able to do?

Do not initially expose receipts, mastery states, graph controls, project administration, or dense dashboards.

The system may clarify the goal into an observable capability, create the Project/Mission, and then request a representative first attempt.

### 4.2 Today

Today is the default return surface for the first-party Web product.

It should answer:

- what is the most useful thing to continue today?
- is any delayed review worth doing first?
- what Project / Mission is active?
- what is the current frontier?
- what session shape fits the learner's available time and energy?

Today should recommend **one primary action**, with alternatives available but visually secondary.

Today is not a dashboard of every metric.

### 4.3 Focus Session

Focus Session is the primary learning surface.

Its job is to protect one learning objective and one current cognitive move from product chrome and unrelated information.

A Focus Session may include:

- current Mission / frontier context;
- one cognitive move;
- conversation or explanation when necessary;
- one or more typed representations;
- learner response / action;
- hint or scaffold controls;
- optional timer;
- optional break transition;
- visible feedback after assessment.

The map, library, state history, and project administration should not dominate this surface.

### 4.4 Session close

The end of a meaningful session should close the learning loop without requiring a ritualized journal.

The product may show:

- what capability evidence changed;
- unresolved uncertainty;
- saved materials;
- state/map proposals requiring attention;
- likely next frontier;
- a suggested Tomorrow Seed.

Reflection remains optional.

### 4.5 Tomorrow Seed

At the end of a session, the system may persist one low-friction starting action for the next session.

A Tomorrow Seed should be concrete, such as:

> Reconstruct the two-layer backpropagation path from memory and explain where each local derivative comes from.

It should not be a vague task such as "continue neural networks".

Tomorrow Seed is an operational continuity aid, not mastery Evidence.

---

## 5. Daily Orchestrator

The Daily Orchestrator is the major new product responsibility. It does not replace the Runtime. It composes Runtime state and non-authoritative context into a learner-facing recommendation.

Conceptually:

```text
recommended_move = f(
  mission,
  accepted_learner_state,
  learning_map,
  current_evidence,
  review_signals,
  daily_context,
  available_time,
  learner_preferences,
  constraints
)
```

### Required properties

- provider-neutral contract;
- one recommended primary action;
- explanation available on request;
- conservative when context is missing;
- no mastery writes;
- no scheduler authority hidden inside the client;
- recommendation can be overridden by learner;
- recommendation changes must be inspectable enough to debug during dogfooding.

### Initial DailyContext v0.1

The first version should remain intentionally small:

```text
energy: 1..5
available_minutes: optional positive integer
focus: optional 1..5
note: optional short text
```

Do not start with wearable integrations or detailed health tracking.

### Move adaptation examples

High energy / long block may prefer:

- derivation;
- novel application;
- transfer;
- multi-step problem solving;
- misconception repair requiring reconstruction.

Medium energy may prefer:

- worked example followed by attempt;
- application;
- guided derivation;
- targeted practice.

Low energy or short blocks may prefer:

- retrieval;
- short discriminative probe;
- misconception check;
- structured reading;
- brief review.

These are policy priors, not hard-coded universal truths. Real evidence should refine them.

---

## 6. Learner-provided context and references

Context should enter through the conversation the learner is already having, not through a separate inbox product.

Supported context should gradually include:

- explicit self-report about prior knowledge, uncertainty, desired rigor, and constraints;
- pasted text and snippets;
- learner-provided files, slides, papers, notes, and code;
- links or named resources the learner is following;
- short temporary instructions that shape only the current session.

Rules:

- context may shape explanation, order, examples, and verification strategy;
- self-report is a routing prior, not mastery;
- a supplied source is not automatically authoritative;
- transient conversation context is not automatically persisted;
- durable LearningMaterial or Reflection creation remains explicit;
- host integrations should carry this context through the same provider-neutral boundary.

This replaces the previous Capture Inbox hypothesis. Real continuity failures may still justify a future specialized interaction, but the roadmap no longer reserves a Capture subsystem in advance.
---

## 7. Reflection

Reflection should have a deliberately loose contract.

### Requirements

- no required schedule;
- no forced prompt sequence;
- free-form first;
- optional links to Project, session, concept, or material;
- local-first by default;
- separate storage / type from Evidence and LearningMaterial;
- learner may later convert a reflection into an assessed Feynman attempt through an explicit action.

The system may offer prompts only as optional affordances.

---

## 8. Review strategy

Longitudinal review is a core future capability, but scheduling semantics must be earned from real learning data.

Current foundation:

- immutable evidence receipts;
- delayed Evidence dimensions;
- learner-state replay;
- descriptive review observation export;
- session-bound checkpoints.

Development sequence:

```text
Review observations
→ Review suggestions
→ dogfooding and trigger validation
→ deterministic simple queue
→ adaptive scheduler
→ optional notifications
```

### Review Suggestions

The first productized step should explain why a concept may deserve review without pretending a validated scheduler already exists.

Possible reasons:

- delayed retrieval failed;
- concept is developing and central to current frontier;
- previous success was heavily scaffolded;
- current Mission depends on it;
- evidence is stale and transfer remains untested.

The first implementation must avoid hidden numerical precision if the evidence does not justify it.

### Scheduler promotion gate

Do not ship an adaptive scheduling algorithm merely because one is available in another product or paper. Promote scheduling only after repeated real Projects show that proposed triggers predict useful retrieval needs across sessions.

---

## 9. Teacher and Capability architecture

The user should primarily experience one coherent Teacher, not a control panel of specialist agents.

Target model:

```text
                    Teacher
                       │
             selects cognitive move
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   Research         Visualize        Practice
   Capability       Capability       Capability
       │               │                │
       └───────────────┼────────────────┘
                       │
                Learning Runtime
```

### Capability rules

A Capability is justified when it performs a multi-step operation that supports a selected learning move. It must not become an alternate source of learner truth.

Potential capabilities:

- source research / verification;
- visualization / representation production;
- practice generation;
- code execution / notebook interaction;
- document / paper reading support;
- later: knowledge-source ingestion.

### Tool vs Capability distinction

Future architecture may adopt a lightweight distinction similar to:

- **Tool**: one bounded call;
- **Capability**: multi-step workflow composed from tools.

The distinction should be introduced only when implementation complexity requires it. It is not necessary to build a plugin framework before the first capabilities exist.

---

## 10. Source and knowledge architecture

Near-term source grounding should remain retrieval-on-demand rather than becoming a full RAG platform.

```text
need source
→ Research Capability
→ retrieve / verify
→ Teacher synthesis
→ learner interaction
→ optional provenance-aware LearningMaterial
```

Do not add embeddings, vector databases, rerankers, ingestion queues, or sync infrastructure solely to make the repository look like a complete AI learning platform.

A persistent Knowledge Center may be promoted later if real use shows repeated need to work over large learner-owned corpora such as many course PDFs, books, papers, videos, and codebases.

---

## 11. Local-first and synchronization

The default architecture remains local-first.

Target long-term shape:

```text
Local Runtime + local learner state
              │
              ├── fully usable offline / local
              │
              └── optional synchronization layer
```

Cloud identity, hosted storage, and collaboration are not prerequisites for the core learning loop.

If sync is added later:

- Runtime receipt identity and conflict semantics must be explicit;
- local operation must remain possible;
- cloud state must not create a second mastery authority;
- sync failures must not corrupt local learning history;
- privacy controls must be explicit.

---

## 12. Naming and branding transition

`ai4learning` is now too generic for the product direction. The repository should eventually move to a distinct product brand while preserving internal compatibility where renaming paths would create unnecessary migration cost.

Naming requirements:

- memorable and pronounceable;
- suitable for both a learner-facing product and technical runtime;
- not limited to "AI tutor" semantics;
- compatible with longitudinal learning / capability growth;
- reasonably searchable;
- no obvious conflict with an established adjacent AI / education product;
- product brand and internal package/runtime names may differ.

`Arcwise` is a strong semantic reference because the project already uses longitudinal learning arcs, but it should remain a working codename until collision checks are complete. Public rename must be a separate explicit change, not bundled into functional architecture work.

---

## 13. Delivery roadmap

### 13.0 Current paper-first focus override — 2026-09-18

The broad vNext phases remain useful architecture history and dependency guidance, but the next delivery cycle is now constrained by a narrower learner-facing proving scenario: **deep paper learning**.

The near-term order is:

```text
Teacher Policy v1
→ Paper Learning v1
→ Research Capability
→ thin ChatGPT / assistant host slice
→ learner-facing LearningMap + Review Suggestions
→ Learner Profile v1
→ longitudinal paper-first dogfooding
```

This ordering supersedes the older assumption that Research Capability is automatically the immediate next feature after Phase 7. Research remains the first specialist Capability, but it is promoted in service of a concrete paper-learning move rather than as standalone infrastructure.

See `docs/PAPER-FIRST-FOCUS.md` for the canonical near-term acceptance criteria and engineering constraints.

The following phase descriptions remain valid unless they conflict with this focus override.

### Phase 0 — Freeze vNext direction

**Goal:** make future work evaluate against one product thesis.

Deliverables:

- this roadmap;
- ADR covering Learning OS / Runtime boundary and the new data classes;
- README pointer to the canonical roadmap;
- old roadmap documents marked as subordinate where appropriate;
- no functional behavior changes.

Acceptance:

- future contributors can identify the source-of-truth roadmap;
- current v0.2 runtime invariants remain unchanged;
- naming remains a separate decision.

### Phase 1 — Minimal Entry and Today shell

**Goal:** make the first-party product understandable before exposing runtime machinery.

Deliverables:

- minimal new-user Entry surface;
- returning-user Today surface;
- one primary recommended action;
- current Project / Mission / frontier summary;
- optional available-time input;
- existing Workspace remains accessible while migration proceeds.

Do not yet add complex recommendation logic.

Acceptance:

A learner can open the product and answer within seconds:

- what am I learning?
- what should I do now?
- how do I begin?

### Phase 2 — DailyContext contract and recommendation boundary

**Goal:** allow context to alter recommendation without becoming learner truth.

Deliverables:

- typed DailyContext v0.1;
- local persistence policy;
- recommendation input/output contract;
- tests proving DailyContext cannot alter mastery directly;
- UI for energy / available time, with focus optional;
- inspectable recommendation rationale for development/dogfooding.

Acceptance:

Changing DailyContext may change move type or session shape but cannot create Evidence, promote mastery, revise the Map, or satisfy Completion.

### Phase 3 — Focus Session

**Goal:** create the main daily learning surface.

Deliverables:

- reduced-chrome session layout;
- current move and learner action central;
- representation / artifact integration;
- existing response-assessment-next-decision loop reused;
- optional timer;
- hint / scaffold pathway;
- lifecycle-safe behavior;
- mobile behavior designed around the canvas first.

Acceptance:

A learner can complete a full evidence-bearing turn without needing to understand receipts, state proposals, or graph controls.

### Phase 4 — Conversation-first correction and host context

**Goal:** make the rigorous Runtime disappear behind a natural learner conversation before expanding the product surface.

Deliver:

- separate learner-facing presentation from internal assessment / Decision control fields;
- accept learner self-report as non-authoritative routing context;
- accept learner-provided references and attachments through a host-neutral context contract;
- apply proportional verification so retrieval/execution occurs only when it changes a teaching decision;
- remove default learner-visible outcome/confidence/falsification bookkeeping;
- validate Agent, first-party Web, and future assistant/plugin hosts separately.

**Gate:**

A learner can complete a meaningful session through ordinary conversation, bring their own material/context, receive adapted teaching without protocol leakage, and avoid unnecessary tool execution.

See `docs/adr/0009-conversation-context-verification.md`, `docs/HOST-INTEGRATION.md`, and `docs/DOGFOOD-2026-09-18-ACTION-PLAN.md`.

**Status:** implemented on `main`; the conversation/host boundary and the dogfooding audit fixes are now baseline behavior.

### Phase 5 — Session Close and Tomorrow Seed

**Status:** implemented on `main` via Issue #83 / PR #84.

**Goal:** make leaving and returning part of the product loop.

Deliverables:

- concise capability-change summary based on accepted Evidence/state only;
- unresolved uncertainty summary;
- material saved during session;
- pending proposal reminder where useful;
- one suggested Tomorrow Seed;
- next opening may foreground that seed when still relevant.

Acceptance:

Session Close must not fabricate capability change from conversation quality, time spent, or self-report.

### Phase 6 — Free-form Reflection

**Status:** implemented on `main` via Issue #85 / PR #86.

**Goal:** provide a learner-owned thinking space without turning journaling into compliance.

Deliverables:

- free-form Reflection surface;
- optional links to Project/session/concept/material;
- local storage contract;
- explicit "use as learning attempt" action if later promoted to Runtime assessment.

Acceptance:

No mandatory reflection prompts or timing gates. Reflection alone cannot change mastery.

### Phase 7 — Authority policy refinement

**Status:** implemented on `main` via Issue #87 / PR #88.

**Goal:** reduce approval fatigue while retaining strict learner-state safety.

Deliverables:

- formal low-/medium-/high-risk transition taxonomy;
- deterministic acceptance policy for proven low-risk updates if justified;
- strong guardrails for stable / transferable promotion and policy override;
- preserved immutable audit trail;
- Map topology remains proposal-first.

Acceptance:

Less learner confirmation friction without any client-side direct mastery write.

### Phase 8 — Capability boundary and first Research Capability

**Status:** implemented on `main` via Issue #89 / PR #102 as a bounded Teacher-invoked Research Capability with host source resolution, strict provenance, minimized local audit, and no learner-state authority.

**Goal:** let one coherent Teacher invoke specialist workflows.

Deliverables:

- minimal provider-neutral Capability interface;
- Research Capability as first real use case;
- source retrieval / verification separated from teaching response;
- provenance surfaced where pedagogically useful;
- capability invocation remains observable in development/audit context but not noisy in learner UI.

Acceptance:

Research may provide source material, but learner interaction and state change still pass through the normal teaching/evidence runtime.

Implementation budget:

- Capability and plugin/host code must live outside `tools/runtime.py` learner-truth authority.
- Do not add Phase 8 fields to `WorkspaceSnapshot` unless they are genuinely part of the shared read model; capability-local state stays capability-local.
- Reuse shared request/storage infrastructure instead of adding route-local copies.
- The host/plugin layer stays thin: translate HostTurn/capability contracts, do not create another learning engine.
- Prefer one concrete Research capability over a generic capability framework.

### Phase 9 — Review Suggestions in Today

**Goal:** turn existing longitudinal evidence into useful learner-facing revisit suggestions without pretending a scheduler is validated.

Deliverables:

- descriptive Review Suggestion contract;
- reasons grounded in accepted evidence/state/map dependency;
- Today integration;
- learner can choose review or continue frontier work;
- dogfooding capture for whether suggestions were useful.

Acceptance:

No hidden due-date algorithm or unexplained score.

### Phase 10 — Simple Review Queue

**Promotion requirement:** only after repeated longitudinal dogfooding validates useful triggers.

Deliverables:

- deterministic queue semantics;
- explicit reason for queue membership;
- queue operation separate from learner-state authority;
- delayed retrieval remains the default evidence-bearing action;
- centrality and Mission relevance may influence priority only if validated.

### Phase 11 — Adaptive Review Scheduling

**Promotion requirement:** only after simple queue behavior produces enough real evidence to justify adaptive timing.

Potential work:

- scheduling model;
- uncertainty handling;
- per-concept history;
- optional reminder/notification layer;
- comparison against simpler baselines.

Do not optimize recall metrics at the expense of application and transfer.

### Phase 12 — Additional typed learning artifacts

Add renderers only when a real learning arc demonstrates a relation that existing representations cannot express well.

Candidate relation classes:

- geometric transformation;
- tensor / matrix axis semantics;
- dataflow;
- state transition;
- quantitative curve;
- dependency / mechanism.

Every artifact must define the learner action it enables.

### Phase 13 — Optional synchronization

Promote only when multi-device use becomes a repeated problem.

Work includes:

- identity and device model;
- receipt sync semantics;
- conflict handling;
- privacy and encryption policy;
- offline-first behavior;
- recovery and migration tests.

### Phase 14 — Persistent Knowledge Center, if earned

Promote only when on-demand research becomes insufficient for real Projects.

Potential components:

- learner-owned corpus ingestion;
- source indexing;
- retrieval;
- provenance;
- source freshness / invalidation;
- data lifecycle.

The knowledge system must not replace learner-model Evidence with document similarity.

### Phase 15 — Collaboration / mentor mode, if earned

Deferred until single-learner daily use is strong.

Possible future modes:

- mentor inspection of accepted state/evidence;
- shared Project resources;
- co-study sessions;
- instructor-authored Missions.

No collaboration feature may introduce an alternate mastery source without a new authority ADR.

---

## 14. Recommended PR sequence

Historical PR numbers above are no longer useful for scheduling. The current recommended sequence is:

```text
Teacher Policy v1
Paper Learning v1: source structure + prerequisite hypotheses
Paper Learning v1: learner-facing loop + evidence-bearing reconstruction
Research Capability (#89), narrowed to Teacher/source verification needs
thin ChatGPT / assistant host adapter over existing HostTurn contracts
LearningMap learner UX + Review Suggestions
Learner Profile v1
longitudinal paper-first dogfooding
```

The simple Review Queue and any adaptive scheduler remain evidence-gated.

Do not stack speculative infrastructure behind these PRs without learner-facing justification.

---

## 15. Cross-cutting engineering requirements

Every new feature must preserve the following.

### 15.1 Provider neutrality

Model/provider transport remains behind adapters. Provider-specific fields do not enter learner state or canonical learning contracts unless unavoidable and explicitly documented.

### 15.2 Runtime authority

React and generic client code do not independently interpret Evidence or write mastery.

### 15.3 Local-first operation

Core learning remains usable without hosted identity or cloud storage.

### 15.4 Typed contracts

Cross-boundary data should have explicit schemas/types where ambiguity could cause authority drift.

### 15.5 Append-only evidence history

Evidence provenance and accepted decisions remain reconstructable.

### 15.6 Compatibility

Legacy learner data remains readable unless a tested migration explicitly supersedes it.

### 15.7 Failure behavior

Provider failure, malformed output, stale state, interrupted Focus Session, or sync failure must not silently fabricate learning progress.

### 15.8 Privacy

DailyContext, Reflection, Session Close / Tomorrow Seed, learner responses, and evidence are private learner data. Remote transmission must remain explicit and minimized.

---

## 16. Evaluation plan

The next phase must dogfood the product as a daily learning environment, not only test isolated runtime correctness.

### 16.1 Primary evaluation questions

- Does the learner know what to do immediately after opening Today?
- Does Focus Session reduce navigation and context switching?
- Do recommended moves match available time and energy well enough to be useful?
- Does natural learner-provided context preserve focus without a dedicated Capture subsystem?
- Does Session Close improve next-day resumption?
- Are capability-delta summaries trusted because they match actual Evidence?
- Which Review Suggestions lead to useful retrieval rather than unnecessary interruption?
- Which saved LearningMaterials are actually revisited?
- Which contexts genuinely improve move selection?

### 16.2 Do not optimize for

- total time in app;
- message count;
- number of generated notes;
- dashboard engagement;
- streak length;
- raw token usage;
- number of agents invoked.

### 16.3 Useful product metrics

Where instrumentation is justified, prefer:

- time-to-first-learning-action;
- session continuation rate across days;
- proportion of sessions producing independent Evidence;
- scaffold removal over time;
- delayed retrieval success/failure;
- transfer attempts;
- ignored vs accepted Review Suggestions;
- Tomorrow Seed continuation rate;
- continuity-friction rate after resuming from a saved Seed;
- learner override rate for Today recommendation.

Metrics are descriptive and must not automatically become learner-state evidence.

---

## 17. Explicit non-goals for the next stage

Unless real use changes the evidence, do not prioritize:

- generic task management;
- calendar replacement;
- detailed health tracking;
- wearable integration;
- social feed;
- public learner profiles;
- XP / coins / leaderboard gamification;
- many visible specialist agents;
- arbitrary self-declared mastery;
- direct graph editing as a core workflow;
- automatic topology acceptance;
- vector database / RAG stack before a corpus problem exists;
- autonomous multi-agent swarm architecture;
- cloud-only learner state;
- transcript-as-memory;
- automatic note generation from every conversation;
- broad LMS features;
- course marketplace;
- content recommendation feed.

---

## 18. Change-control rule

Future development may change this roadmap when real use produces better evidence, but changes should be explicit.

A significant change should state:

1. which observed learner problem motivated it;
2. which existing principle or phase ordering changes;
3. whether any authority boundary changes;
4. what migration or compatibility impact exists;
5. how success will be evaluated.

If a proposed feature cannot explain which learner action, continuity failure, or evidence-quality problem it improves, it should not enter the roadmap yet.

---

## 19. Definition of success for vNext

The vNext product is successful when a learner can repeatedly do this without reading project documentation:

```text
open product
→ see one useful next action
→ enter a focused learning surface
→ perform an evidence-bearing cognitive move
→ receive feedback
→ leave with trustworthy continuity
→ return later to an adapted next move or useful review
```

And, at any point, the system can answer:

> What can the learner now do independently that they could not do before?

That is the product standard against which the remaining roadmap should be judged.
