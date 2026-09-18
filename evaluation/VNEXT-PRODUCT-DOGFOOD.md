# vNext Product Dogfooding

This protocol evaluates the learner-facing AbleArc product loop before promoting later vNext phases.

It complements the longitudinal runtime evaluation in `RUNBOOK.md`; it does not replace `SESSION.md`, Runtime Evidence, or the promotion process in `PROMOTION.md`.

## Boundary

Product dogfood checkpoints are local evaluation artifacts under `.dogfooding/`.

They are **not** learner state and must not:

- create Runtime Evidence;
- change mastery;
- revise the LearningMap;
- change Project lifecycle state;
- satisfy Completion;
- decide that any later feature should be promoted.

New v0.3 checkpoints identify their originating `entry_mode` as `workspace` or
`agent`. The two modes use different surface and observation contracts, and
summaries keep their populations separate. New checkpoints use the
interpretation marker:

```text
descriptive_only_no_feature_promotion
```

Legacy v0.1 checkpoints with `descriptive_only_no_phase4_promotion` remain readable for compatibility.

## Observation before solution

Dogfooding should record learner-visible behavior before naming a feature that might solve it.

Do not enter a session looking for evidence that any preselected roadmap feature is needed. That primes the learner/evaluator and turns the pilot into confirmation of a solution rather than observation of a problem.

Use this order instead:

```text
real use
  ↓
observable friction / interruption / confusion
  ↓
neutral description
  ↓
repetition or structural severity
  ↓
solution hypotheses
  ↓
promotion review
```

A feature idea can come from the learner, from later analysis, or from an existing roadmap hypothesis. None of those should change what is recorded during the session.

## What to observe

Choose the entry mode that actually originated the session. Do not create a
Workspace checkpoint for an Agent session merely to preserve the older shape.

### Workspace mode

Use the real learner-facing path:

```text
Entry
  ↓
Today + DailyContext
  ↓
Focus Session
  ↓
response → assessment → next Runtime Decision
```

Observe only behavior that actually happened.

#### Surface checks

Each checkpoint records `pass | friction | not_observed` for:

- `entry` — the capability-oriented entry is understandable;
- `today` — one primary action is obvious quickly;
- `daily_context` — context changes are understandable and useful;
- `focus` — reduced chrome helps concentration without hiding required controls;
- `evidence_turn` — one evidence-bearing turn completes without exposing Runtime machinery;
- `lifecycle` — paused/archive behavior remains understandable and safe;
- `mobile` — narrow layout keeps the learning canvas first.

#### Product observations

The v0.3 Workspace observation fields remain intentionally narrow and solution-neutral:

- `entry_time_seconds` — observed time to understand what to do on Entry;
- `today_primary_action_clear` — whether the primary action was immediately clear;
- `daily_context_usefulness` — `useful | mixed | cosmetic | not_observed`;
- `focus_chrome` — `reduced | distracting | missing_controls | not_observed`;
- `scaffold_effect` — `helpful | too_revealing | insufficient | not_used | not_observed`;
- `continuity_friction` — `none | single | repeated | not_observed`;
- `authority_confusion` — whether the learner treated non-authoritative interaction as mastery/evidence;
- `turn_friction` — `none | low | material | blocked | not_observed`.

`continuity_friction` means an observed break in the learner's flow or context continuity. It deliberately does **not** encode why the break happened or which feature should solve it. Put the smallest factual description in `notes` when needed.

### Agent mode

Agent mode observes the host conversation and Learning Engine integration. It
does not contain placeholder fields for Entry, Today, DailyContext, Focus,
lifecycle UI, or mobile layout.

Its surface checks are:

- `conversation` — natural dialogue stays separate from control protocol;
- `learner_context` — self-report and learner-provided references reach the teaching decision;
- `control_trace` — meaningful decisions and learner actions remain traceable;
- `runtime_turn` — the evidence-bearing Runtime turn completes coherently;
- `verification` — tools are used only when they can change the teaching decision.

Its typed observations are:

- `conversation_naturalness` — `natural | mixed | mechanical | not_observed`;
- `context_usefulness` — `useful | mixed | cosmetic | not_observed`;
- `control_trace_alignment` — `aligned | late | missing | not_observed`;
- `verification_budget` — `proportionate | overused | underused | not_observed`;
- `continuity_friction`, `authority_confusion`, and `turn_friction` — the same neutral categories used where applicable in Workspace mode.

### Legacy checkpoint compatibility

Schema v0.1 used the solution-shaped field `capture_need`; v0.2 replaced it
with `continuity_friction` but did not identify an entry mode. Existing v0.1
and v0.2 records remain readable and are treated as Workspace observations for
compatibility. New checkpoints are always v0.3 and never contain
`capture_need`.

## Workflow

First run a real longitudinal session and complete the normal `sessions/NNN.md` record.

Then create a product checkpoint for that same latest session:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc-name> --entry-mode workspace
```

For a host/Agent session, use `--entry-mode agent` instead.

The command creates:

```text
.dogfooding/<arc-name>/product-observations/NNN.json
```

The file starts with `not_observed` / `null` values. Edit only what was actually observed. Do not convert absence of observation into a pass.

If `status` later reveals that an older real session is missing its product checkpoint, create a blank checkpoint for that existing session explicitly:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc-name> --entry-mode workspace --session 001
```

Backfill is allowed only when `sessions/001.md` actually exists. The command never creates or reconstructs a session record and still starts from `not_observed` / `null`; fill only observations that were genuinely recorded or can be responsibly recovered from contemporaneous notes.

Inspect session/checkpoint coverage at any time:

```bash
python tools/vnext_product_dogfood.py --repo . status <arc-name>
```

`status` is diagnostic only. It reports the numbered session records, existing product checkpoints, sessions that still lack a checkpoint, and orphan checkpoints that no longer have a matching `sessions/NNN.md`. It emits no pass/fail or feature-promotion verdict.

Validate all product checkpoints in the arc:

```bash
python tools/vnext_product_dogfood.py --repo . validate <arc-name>
```

Validation is stricter than `status`: every checkpoint must be valid and must have a matching real numbered session record. Orphan checkpoints are rejected instead of being counted as evidence.

Print descriptive counts across the arc:

```bash
python tools/vnext_product_dogfood.py --repo . summary <arc-name>
```

The summary intentionally has no promotion verdict. Workspace and Agent counts
are nested under separate `entry_modes` keys, so incompatible surface
populations are never aggregated. For mixed historical data, v0.1
`capture_need` values are reported only through the Workspace
`continuity_friction` aggregate.

## From observation to a feature hypothesis

Only after real sessions reveal a problem should a feature hypothesis be evaluated.

For any proposed feature, ask:

1. What learner-visible behavior actually occurred, stated without naming the solution?
2. Is it repeated across independent sessions, or is it severe enough to be structural after one observation?
3. What is the consequence for learning, continuity, evidence quality, or usability?
4. What is the smallest sufficient fix?
5. Does the proposed feature preserve Runtime authority and the local/private boundary?

The former Capture Inbox hypothesis is now `not_promoted_for_now` and removed from the canonical roadmap. Continue recording continuity friction neutrally because future evidence may reveal a real problem, but do not treat that field as a latent Capture requirement.

If evidence for any new feature is insufficient, choose `collect_more_evidence` or `not_promoted_for_now` rather than manufacturing a product requirement.

## Privacy

Raw product observations remain private by default. Keep learner identity, raw transcripts, private course material, and unrelated personal context out of the repository.

If a product failure justifies a public change, reduce it to the minimum anonymized evidence needed to explain the behavior, following `evaluation/PRIVACY.md`.
