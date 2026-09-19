# Paper-first Product Focus

Status: **Implementation chain complete; longitudinal paper-first dogfooding active**  
Date: 2026-09-18  
Scope: next ~3 months of AbleArc development

This document narrows the broad vNext roadmap into the next product proving loop. It does not replace Runtime authority, storage, compatibility, or accepted ADR boundaries. Where the older Phase 8+ ordering conflicts with this document, this document controls near-term delivery priority.

## Product question

Stop asking:

> Which Learning OS module is still missing?

For the next stage, ask:

> What would make a learner actually understand something better, retain the state of that learning across sessions, and resume naturally?

The product chain is:

```text
learner arrives with a goal / question / source
        ↓
AbleArc uses durable background + current context
        ↓
understands the source and its knowledge structure
        ↓
Teacher selects the next useful learning move
        ↓
explain / ask / contrast / derive / practice
        ↓
learner produces real performance
        ↓
diagnose what is understood, missing, or misconceived
        ↓
adjust the next move
        ↓
persist across sessions
        ↓
delayed retrieval / transfer
```

Runtime, LearningMap, Evidence, Library, Reflection, Research, and host integrations serve this loop. They are not goals by themselves.

## Primary proving scenario: learn a paper deeply

For the next product cycle, paper learning is the primary dogfooding slice.

Target user request:

> Help me actually understand this paper.

The success condition is not "generated a summary" or "covered every section." AbleArc should help the learner reconstruct:

1. what problem the paper addresses;
2. why the problem matters;
3. what prior approaches fail to provide;
4. the core idea;
5. how the method works;
6. what evidence supports which claims;
7. what the evidence does **not** establish;
8. limitations and boundary conditions;
9. relationships to prior knowledge / related work;
10. whether understanding transfers to a neighboring problem.

Paper learning is useful because it exercises source handling, prerequisites, LearningMap, explanation, equations/figures, Evidence, transfer, session continuity, and review in one coherent scenario.

## Canonical near-term priority

```text
Teacher Policy v1
        ↓
Paper Learning v1
        ↓
Research Capability
        ↓
ChatGPT / assistant host slice
        ↓
LearningMap UX + Review Suggestions
        ↓
Learner Profile v1
        ↓
longitudinal paper-first dogfooding
```

Do not expand Runtime schema merely to keep roadmap velocity.

### Implementation checkpoint — 2026-09-19

The implementation chain through Learner Profile v1 is now on `main`:

- Teacher Policy v1 — Issue #93 / PR #99;
- Paper Learning entry planner — Issue #94 / PR #100;
- evidence-gated paper completion profile — Issue #95 implementation slice / PR #101;
- bounded Research Capability — Issue #89 / PR #102;
- thin ChatGPT / assistant host — Issue #96 / PR #103;
- learner-facing LearningMap + Review Suggestions — Issue #97 / PR #104;
- Learner Profile v1 — Issue #98 / PR #105.

The current phase is **longitudinal paper-first dogfooding**. Issue #95 remains open because its acceptance criterion is behavioral across real sessions. Delayed retrieval, next-session resumption, and transfer cannot be inferred from source parsing, CI, or same-session tests.

Do not fabricate successful sessions or add another subsystem merely to make the roadmap look complete. The next general product changes should come from observed failures or repeated friction in real paper-learning use.

## A. Teacher Policy v1 — P0

Teacher quality is the highest priority because the Runtime can already record Evidence; learning quality now depends on what the Teacher does each turn.

Teacher Policy v1 is a small set of behavioral rules, not one giant prompt.

Core interaction rules:

1. **Answer before assessing.** If the learner is asking a real question, answer it before turning the turn into a test.
2. **Diagnose before reteaching.** When performance breaks, identify the failure mode before choosing intervention.
3. **Test lightly, not constantly.** Evidence capture should fit natural learning rather than making every turn an exam.
4. **Never block curiosity.** The learner may advance with uncertainty; uncertainty is recorded rather than converted into fake mastery.
5. **Expand horizons selectively.** Show useful connections when they improve the model, not as ritualized extra content.

Tone should avoid repetitive AI-teacher ceremony, generic praise, and scripted "three steps" framing when normal expert conversation is clearer.

### Failure-mode → teaching policy

Existing `failure_mode` must influence action rather than remain metadata.

```text
slip
→ brief correction; do not reteach the whole concept

missing_prerequisite
→ temporarily descend to the prerequisite

wrong_causal_model
→ expose the model with a counterexample / contrast / reconstruction

overgeneralization
→ introduce a boundary or contrast case

failed_transfer
→ preserve the base concept; vary the context and diagnose the mapping failure
```

## B. Paper Learning v1 — P0

The first real product slice starts from a learner-provided paper or equivalent source.

Initial flow:

```text
paper / source
→ structural parse
→ problem / claims / method / evidence / limitations
→ prerequisite hypotheses
→ 2–4 lightweight learner-background questions
→ initial personalized learning path
→ natural teaching turns
→ evidence-bearing reconstruction / application
→ session close + continuation
```

Do not begin by dumping a section-by-section summary.

Support two implicit source modes:

### Follow-the-source

For prompts such as "teach me from these lecture slides":

- broadly preserve source order;
- insert prerequisite repair when needed;
- keep source framing visible.

### Understanding-first

For prompts such as "I want to understand this paper":

- reorder material by dependency and explanatory value;
- use the source as evidence/material, not as a mandatory curriculum order.

No large mode selector is required if host intent is clear.

## C. Research Capability — P1

Issue #89 remains valid, but it is no longer the immediate next feature.

Research exists for a selected Teacher move:

```text
Teacher
→ material uncertainty requires verification / external source
→ Research Capability
→ findings + provenance + uncertainty/conflict
→ Teacher synthesis
→ learner interaction
```

Research must not directly:

- create learner Evidence;
- change mastery;
- revise the LearningMap;
- complete a Mission.

First version remains retrieval-on-demand. Do not add embeddings, vector DBs, ingestion queues, rerankers, or a generic agent framework.

## D. ChatGPT / assistant host slice — P1

After Paper Learning is coherent, expose the same learning engine through a thin host adapter.

First host-facing operations should stay minimal, roughly:

```text
start_or_continue_learning
provide_learning_context
get_learning_state
```

The adapter translates host context into AbleArc contracts. It does not own mastery logic, map logic, Evidence policy, or Teacher policy.

Host transcript policy:

- the host may retain full conversation history;
- AbleArc persists only durable learner context, actual learner actions/Evidence, relevant materials, and structured learner state;
- do not mirror every host message into AbleArc storage.

## E. LearningMap UX + Review Suggestions — P1

LearningMap should become learner-readable rather than internal JSON.

The learner needs to understand:

- where they are;
- what appears stable;
- what is developing;
- what prerequisite blocks the frontier;
- what useful directions exist next.

Do not surface receipt IDs, authority protocol, proposal revision mechanics, or internal policy fields in the main learner UI.

Review first ships as **suggestions**, not a validated scheduler:

> You learned X four days ago; a short retrieval attempt may now be useful.

Actions may be: Review now / Skip / Not today.

Do not promote SM-2/FSRS, push infrastructure, email reminders, or a complex scheduler until real behavior justifies them.

## F. Learner Profile v1 — P2

Durable learner context is distinct from learner-state mastery.

Candidate fields:

- previous exposure;
- self-reported strengths / weaknesses;
- goals;
- courses or source context;
- preferred explanation style;
- language;
- pace / time tendency;
- tools / programming languages.

Example:

```text
"Studied linear algebra before, but eigenvalues are weak."
```

may produce durable self-report context, but must not directly change `eigenvalues mastery`.

## Engineering constraints

### Runtime expansion freeze

`tools/runtime.py` should not absorb Research, plugin transport, Reflection UX, Review UI, or source parsing. Only learner truth / Evidence / authority mechanics belong there.

### Workspace data is a façade

Keep the external read surface stable. If it grows materially, split internal readers such as:

```text
project-read-model
runtime-read-model
map-read-model
material-read-model
```

without creating multiple learner-truth implementations.

### Capabilities remain separate

Prefer:

```text
capabilities/
  research/
  execute/
  visualize/
```

over growing Runtime into a generic feature container.

## Evidence policy direction

Do not over-generalize this yet. Accumulate paper-learning behavior first.

A useful eventual shape is:

```text
concept:
explain → discriminate → apply → transfer

procedure:
perform → diagnose → boundary → transfer

paper understanding:
reconstruct claim
→ explain method
→ connect evidence
→ identify limitation
→ compare / transfer
```

Promote these patterns into Runtime policy only after repeated real sessions justify them.

## Notifications

Notification transport is explicitly downstream of Review quality.

Correct sequence:

```text
first: can AbleArc decide that a review reminder is worthwhile?
then: which channel should deliver it?
```

Possible future transports include host tasks/reminders, browser push, email, or desktop notifications. None are a current prerequisite.

## Dogfooding rule

AbleArc does not currently lack ideas; it lacks sustained product evidence.

For this focus period, prefer repeated real paper-learning use across days over adding more modules. Track:

- time to useful first teaching action;
- prerequisite-diagnosis quality;
- how often the Teacher over-tests or over-explains;
- whether source order should be preserved or reorganized;
- quality of claim/method/evidence/limitation reconstruction;
- next-session resumption quality;
- delayed retrieval and transfer;
- ignored vs useful Review Suggestions.

The roadmap should increasingly be constrained by observed learning behavior, not by the desire to fill a feature checklist.
