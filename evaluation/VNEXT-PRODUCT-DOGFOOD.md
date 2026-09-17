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
- decide that Phase 4 or any later feature should be promoted.

The checkpoint interpretation marker is therefore fixed to:

```text
descriptive_only_no_phase4_promotion
```

## What to observe

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

### Surface checks

Each checkpoint records `pass | friction | not_observed` for:

- `entry` — the capability-oriented entry is understandable;
- `today` — one primary action is obvious quickly;
- `daily_context` — context changes are understandable and useful;
- `focus` — reduced chrome helps concentration without hiding required controls;
- `evidence_turn` — one evidence-bearing turn completes without exposing Runtime machinery;
- `lifecycle` — paused/archive behavior remains understandable and safe;
- `mobile` — narrow layout keeps the learning canvas first.

### Product observations

The typed observation fields are intentionally narrow:

- `entry_time_seconds` — observed time to understand what to do on Entry;
- `today_primary_action_clear` — whether the primary action was immediately clear;
- `daily_context_usefulness` — `useful | mixed | cosmetic | not_observed`;
- `focus_chrome` — `reduced | distracting | missing_controls | not_observed`;
- `scaffold_effect` — `helpful | too_revealing | insufficient | not_used | not_observed`;
- `capture_need` — `none | single | repeated | not_observed`;
- `authority_confusion` — whether the learner treated non-authoritative interaction as mastery/evidence;
- `turn_friction` — `none | low | material | blocked | not_observed`.

`capture_need` is descriptive. A value of `repeated` means repeated need **inside that session**; it does not promote Capture Inbox by itself.

## Workflow

First run a real longitudinal session and complete the normal `sessions/NNN.md` record.

Then create a product checkpoint for that same latest session:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc-name>
```

The command creates:

```text
.dogfooding/<arc-name>/product-observations/NNN.json
```

The file starts with `not_observed` / `null` values. Edit only what was actually observed. Do not convert absence of observation into a pass.

Validate all product checkpoints in the arc:

```bash
python tools/vnext_product_dogfood.py --repo . validate <arc-name>
```

Print descriptive counts across the arc:

```bash
python tools/vnext_product_dogfood.py --repo . summary <arc-name>
```

The summary intentionally has no promotion verdict.

## Phase 4 gate

Before implementing Capture Inbox, inspect repeated real sessions and complete a promotion record using `evaluation/PROMOTION.md`.

Evidence for promotion should answer:

1. Did learners repeatedly need to leave the learning flow to preserve unrelated thoughts/tasks?
2. Did that task switching materially damage focus or continuity?
3. Would fast local capture be the smallest sufficient fix?
4. Can the feature remain non-authoritative by default?
5. Is the need repeated across sessions rather than inferred from one anecdote?

If the evidence is insufficient, choose `collect_more_evidence` rather than manufacturing a product requirement.

## Privacy

Raw product observations remain private by default. Keep learner identity, raw transcripts, private course material, and unrelated personal context out of the repository.

If a product failure justifies a public change, reduce it to the minimum anonymized evidence needed to explain the behavior, following `evaluation/PRIVACY.md`.
