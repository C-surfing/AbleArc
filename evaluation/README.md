# Teaching Runtime Evaluation

This directory evaluates whether **AbleArc** produces durable learner capability, not whether the tutor sounds helpful.

## Primary outcome

The unit of success is a **capability delta**:

```text
capability_after - capability_before
```

A session is useful only when there is evidence that the learner can now independently do something they could not reliably do before: recall, explain, derive, discriminate, apply, debug, or transfer.

Do not use response length, user praise, tutor fluency, or one correct answer as a mastery proxy.

## Evidence ladder

Use the same progression as the teaching protocol:

1. `recognition` — identifies or distinguishes the idea with cues;
2. `recall` — retrieves the idea without the answer being present;
3. `explanation` — reconstructs the mechanism or reasoning in their own model;
4. `application` — uses the idea in a relevant task;
5. `transfer` — uses it in a meaningfully different context with limited scaffolding.

Evidence is concept-specific. A learner may be transferable on one node and only exposed on another.

## Conservative state transitions

- One correct response is evidence, not mastery.
- Mark `stable` only when the learner succeeds on at least two meaningfully independent pieces of evidence, preferably separated by task form or time.
- Mark `transferable` only after successful use in a novel context that was not demonstrated immediately beforehand.
- A misconception is resolved only when the learner's generative model changes enough to avoid reproducing the same error in use.
- Self-reported confidence may guide probing but does not promote state by itself.

These are default evidentiary standards, not rigid scoring rules. Domain evidence can justify a different decision if recorded explicitly.

## Evaluation artifacts

- `FIRST-PILOT.md` — end-to-end runbook for a real learner-facing Web session during the active K8 validation gate.
- `SESSION.md` — one meaningful session record.
- `ARC.md` — cross-session contract for a longitudinal learning arc.
- `RUNBOOK.md` — execution procedure for running real dogfooding without turning the learner experience into an evaluation form.
- `VNEXT-PRODUCT-DOGFOOD.md` — typed learner-facing product observations with a descriptive-only, no-feature-promotion boundary.
- `PROMOTION.md` — evidence gate before general Teach/Study protocol changes.
- `FAILURE-TAXONOMY.md` — classify failures before changing the protocol.
- `DOMAINS.md` — initial five-domain dogfooding matrix.
- `REPRESENTATIONS.md` — evaluate whether a representation changed learner capability rather than merely improving presentation.
- `REVIEW-SIGNALS.md` — collect delayed-retrieval observations before defining any Review priority or scheduler policy.
- `arcs/` — launch briefs for the five required v0.2 longitudinal arcs.

Real learning state remains in `.learning/`. Evaluation records describe evidence about the runtime and should not be copied into `STATE.md` as transcript history.

## Longitudinal unit

Prefer an **arc** over a single conversation:

```text
session 1: establish frontier
session 2: retrieve + extend
session 3: perturb representation / assumption / context
session 4: transfer or delayed revisit when needed
```

An arc should make it possible to answer:

- Did the system remember the learner accurately?
- Did its roadmap change when evidence contradicted it?
- Did it choose different interventions as the learner changed?
- Did apparent understanding survive retrieval or transfer?
- Did the learner become less dependent on the tutor?

A later session must depend on earlier evidence. If the same script could be run unchanged with a new learner, the experiment is not yet testing longitudinal adaptation.

### Observing future Review semantics

Do not invent a scheduler from intuition. Two existing tools serve different evaluation purposes:

```bash
# live read-only report from current Runtime history
python tools/review_observations.py --repo .

# immutable session-bound snapshot for one real dogfooding arc
python tools/review_checkpoints.py --repo . <arc-name>
```

The live export joins delayed Evidence to the learner's accepted state immediately before that attempt, its Evidence dimensions, optional Turn context, and later accepted transitions that explicitly cite the Evidence. The checkpoint freezes that descriptive view for the current numbered session so later evidence cannot rewrite what was observable then.

Neither tool outputs a priority, score, due time, or queue membership. Use repeated checkpoints/observations to formulate and falsify review-trigger hypotheses. A pattern seen once is not a scheduling rule.

## Recommended execution order

For a learner-facing Web run during K8, start with `FIRST-PILOT.md`. For continued longitudinal evaluation, use the broader sequence below:

```text
choose real mission
    ↓
pick domain arc brief
    ↓
initialize ARC contract
    ↓
run Teach / Study normally
    ↓
record decisive SESSION evidence
    ↓
record product checkpoint when evaluating learner-facing surfaces
    ↓
retrieve later with less scaffolding
    ↓
export delayed review observations when available
    ↓
perturb one meaningful dimension
    ↓
transfer / revisit
    ↓
classify failures
    ↓
PROMOTION gate if runtime/product change is justified
```

Do not pre-fill success. `insufficient_evidence` is a valid outcome.

## Promotion rule

Do not add a new rule to `skills/teach/SKILL.md` because one conversation was awkward. First classify the failure and ask whether the smallest fix belongs in:

1. learner-state representation;
2. frontier inference;
3. teaching-decision logic;
4. interaction policy;
5. verification / mastery inference;
6. roadmap or persistence behavior;
7. domain-specific teaching strategy;
8. representation / source / tooling layer.

Promote a protocol change when a failure is repeated across independent sessions or is a clearly structural failure with high consequence. Use `PROMOTION.md` to record the generality test, smallest-fix test, overfitting audit, and distinguishing behavioral scenario before changing core rules.

A Review scheduler is held to the same bar. Descriptive delayed-Evidence exports are preparation for that decision, not permission to encode timing heuristics prematurely.

Avoid case-specific patches, benchmark phrases, topic-specific answer rules, or heuristics that cannot be explained as teaching logic.

## What this is not

This is not a leaderboard and not an attempt to reduce teaching quality to one scalar score. Quantitative counts can help find regressions, but the core object is the learner model transition supported by observable evidence.
