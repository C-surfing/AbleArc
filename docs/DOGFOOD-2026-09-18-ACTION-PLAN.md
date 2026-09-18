# 2026-09-18 Dogfooding Correction Plan

Status: **Active corrective plan**  
Evidence source: one real learner / one procedural programming topic / Agent entry mode, plus Issues #56–#71
Scope: product interaction, Runtime semantics, evaluation integrity, and host integration

This plan translates the first substantial AbleArc dogfooding session into development priorities. It does not treat one session as proof of universal learner behavior. It does treat structural failures—where the current data model cannot represent what happened, or the product exposes internal protocol as conversation—as sufficient reason to repair the architecture before adding optional product surfaces.

## 1. What the session established

The teaching loop can produce useful adaptation, but four boundaries are currently wrong or incomplete:

1. **Conversation and control are coupled.** Internal fields such as cognitive move, expected evidence, falsification signal, evidence outcome, and confidence leak into the learner-facing interaction. Prompt polish alone cannot fix this.
2. **The learner model learns mostly from success.** In the observed run, supports evidence changed state while contradicting/inconclusive evidence often could not affect the model. The model therefore loses the most useful information for choosing the next teaching move.
3. **Verification is over-eager in technical learning.** The protocol strongly suggests inspect/run/build loops even when a language model can resolve a conceptual or semantic question directly. Tool use needs a decision-value test.
4. **Context is too narrow.** Learner-provided references, self-reported prior knowledge, uncertainty, current course/material, and practical constraints are not first-class routing inputs even though they can eliminate unnecessary diagnosis.

The dogfood session also found concrete integrity and usability defects tracked in Issues #56–#69. Those issues should now be treated as one correction program rather than unrelated backlog items.

## 2. Corrected product model

AbleArc should operate as three separable planes:

```text
Learner / host conversation
        │
        ▼
Conversation Plane
natural message, references, self-report, attachments
        │
        ▼
Learning-Control Plane
Mission / Decision / Observation / Evidence / state / map
        │
        ▼
Capability + Verification Plane
retrieval / source check / code execution / visualization / external tools
```

### Conversation Plane

The learner experiences ordinary dialogue. It may contain explanation, a question, feedback, a compact representation, or a request to act. It must not require the learner to understand Runtime vocabulary.

### Learning-Control Plane

The Runtime remains rigorous and inspectable, but its receipts are an internal control protocol. A visible message is not a serialized Decision receipt, and every chat message does not need a complete evidence cycle.

### Capability + Verification Plane

Tools are invoked only when they can resolve a material uncertainty or create valuable learner action. “A tool is available” is not a reason to call it.

## 3. Product requirements derived from the six reported problems

### R1 — Natural dialogue is a product invariant

- Keep receipt IDs, mastery bookkeeping, evidence outcome labels, confidence labels, and falsification mechanics hidden by default.
- Generate learner-facing feedback separately from internal assessment semantics.
- Permit direct explanation when it is the lowest-friction high-value move.
- Avoid ritual phrases, repeated phase announcements, artificial praise, and constant Socratic questioning.
- Do not make every learner utterance feel like a form submission.

Acceptance signal: a learner can complete a session without seeing internal Runtime vocabulary unless they explicitly inspect it.

### R2 — AbleArc must be host-embeddable

The Learning Engine should be usable from ChatGPT-like products, coding agents, research agents, IDE assistants, and the first-party Web surface through a provider/host-neutral adapter.

The host contract should accept:

- a learner message/event;
- conversation context;
- optional Project/Mission identity;
- learner-provided references/attachments;
- optional self-report/context;
- host capabilities available for this turn.

It should return two channels:

- **presentation**: a natural learner-facing response;
- **control**: validated internal proposals/receipts needed by AbleArc.

The host must not become a second mastery authority.

### R3 — Learner-provided material is first-class context

Introduce a reference-context contract for files, pasted text, URLs, course notes, papers, code, and “I am following this resource” signals.

References can be used as:

- the learner’s chosen explanatory frame;
- a source to compare against;
- a curriculum/order constraint;
- factual grounding;
- an object to critique.

A reference is not automatically mastery Evidence, and a source supplied by the learner is not automatically authoritative.

### R4 — Self-report is a routing prior, not mastery

The learner may say:

- what they already know;
- what they do not know;
- what feels shaky;
- what course/book they are following;
- their desired rigor;
- time/energy constraints;
- whether they want an explanation, practice, debugging, or review.

Use this to skip low-value diagnosis and form a hypothesis. Verify behavior only when the distinction changes a meaningful teaching decision. Self-report must not directly promote stable/transferable mastery.

### R5 — Smoothness comes from fewer protocol crossings

Default interaction rule:

```text
ordinary dialogue
→ create a meaningful learning turn only when there is a decision worth tracing
→ record evidence only when learner behavior can support a later decision
→ persist only changes with future value
```

Avoid tool calls, state writes, map proposals, and UI transitions that do not change the learner’s next useful action.

### R6 — Use a verification budget

Use the cheapest sufficient verification level:

| Level | Default | Use when |
|---|---|---|
| V0 — reason/explain | no external tool | stable conceptual knowledge, simple semantics, derivation that can be checked directly |
| V1 — retrieve/source-check | source lookup | current facts, quotations, source-specific claims, standards/APIs, uncertainty, learner-supplied material |
| V2 — execute/test | code/build/runtime | concrete program behavior, learner code, environment/version effects, ambiguous stateful behavior, correctness where execution changes the decision |

Before V1/V2 ask internally: **What uncertainty will this action resolve, and what will change if the result differs?** If there is no material answer, do not invoke the tool.

For programming, the preferred loop becomes:

```text
predict
→ reason / inspect
→ execute only when execution is decision-relevant
→ explain
→ modify
→ transfer
```

## 4. Issue program

### P0 — Product trust and low-risk correctness

- #56 fresh-clone initialization deadlock
- #57 Runtime move enum vs published schema drift
- #67 empty session template counted as real evidence
- #69 / #71 entry-mode-aware product checkpoints (implemented as schema v0.3 with separate Agent and Workspace aggregates)

### P1 — Learner-model semantics

- #58 failed first attempt / contradicting and inconclusive evidence
  (`unknown → exposed` corrected so first contact is recordable without a mastery claim)
- #59 frontier hypothesis revision / prerequisite discovered
- #60 failure-mode taxonomy
- #61 evidence artifact form

These should be designed together because they describe one missing concept: **negative/ambiguous evidence must change the tutoring hypothesis without being forced into mastery promotion**.

### P1 — Trace integrity

- #63 rejected authority decisions must leave receipts
- #64 response-to-decision attribution must not silently mismatch
- #65 decision-after-action drift must be detectable

### P2 — Topology and domain ergonomics

- #62 connect discovered concepts to a draft/proposed LearningMap
- #66 readable Unicode project identity
- #68 procedural / skill-acquisition arc

## 5. Delivery sequence

### Correction Slice A — conversation-first behavior

Deliver now:

- Teach prompt: natural conversation, learner self-report, learner references, verification budget.
- Web transitional prompt: make `result_summary` and `learner_action` learner-facing and free of protocol jargon.
- Web surface: remove default display of outcome/confidence/falsification bookkeeping.
- ADR: separate presentation from control semantics.

### Correction Slice B — evaluation and schema integrity

Deliver now:

- publish the actual Runtime move enum in `runtime-v0.2.json`;
- add a test that Runtime and schema enums stay identical;
- stop counting untouched session templates as real session records;
- add a procedural dogfood arc.

### Correction Slice C — host adapter boundary

Next:

- define a host-neutral turn envelope and presentation/control response envelope;
- implement a local reference adapter first;
- implement a ChatGPT/assistant host adapter as a thin mapping over the same envelope;
- keep first-party Web as another host, not a privileged authority path.

Do not create host-specific learner-state semantics.

### Correction Slice D — negative evidence model

Next:

Design one coherent Runtime v0.3 proposal covering:

- `failure_mode`;
- `artifact_form`;
- explicit frontier-hypothesis revision/supersession;
- a way for contradicting/inconclusive first evidence to make the concept “observed but not demonstrated” without pretending it is a mastery promotion.

Migration and v0.2 compatibility must be explicit before implementation.

### Correction Slice E — trace integrity and map continuity

Then:

- record rejected authority attempts;
- detect/forbid ambiguous response attribution;
- expose late-recorded decision drift;
- generate a draft map proposal when new decision concepts are absent from the canonical map.

## 6. Dogfooding metrics for the next sessions

Track behavior, not vanity metrics:

- visible protocol leakage count;
- unnecessary tool/execution calls;
- turns where self-report avoided a redundant probe;
- turns where a learner-provided reference materially changed explanation/order;
- response-to-useful-feedback latency;
- repeated questions caused by lost context;
- number of contradicting/inconclusive evidence items that changed a future teaching decision;
- unrepresented learner behavior discovered during the session.

Compare Agent, first-party Web, and future host/plugin entry modes separately. Do not aggregate surfaces that cannot observe the same behavior.

## 7. Promotion rule

This correction gate takes priority over optional vNext feature expansion. **Capture Inbox is explicitly not promoted and is removed from the canonical architecture.** Richer Review, notifications, or additional product chrome may proceed only when independent of these foundations and justified by observed need.

If future dogfooding reveals a repeated “I need to externalize this without losing focus” problem, reopen the problem—not the old solution—and choose the smallest sufficient interaction. Ordinary conversational context should cover the default case.

The next product milestone is not “more features.” It is:

> **A learner can bring their own context and material into a natural conversation, AbleArc can adapt rigorously underneath it, and tools appear only when they add decision value.**
