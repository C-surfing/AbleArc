# Dogfooding Runbook

This runbook turns the v0.2 evaluation design into a repeatable workflow for real learning sessions.

## Private evidence workspace

Real learner state and raw dogfooding evidence are local by default.

Use:

```text
.learning/      # operational learner state
.dogfooding/    # raw arc/session evidence and private notes
```

Both paths are ignored by Git by default. Keep raw transcripts, identifiable learner details, private course material, unpublished papers, account information, and other sensitive context out of the public repository.

The public `evaluation/` directory contains protocols and templates. If a real failure is worth contributing publicly, reduce it to the minimum anonymized evidence needed to understand the runtime behavior. See `evaluation/PRIVACY.md`.

Synthetic acceptance scenarios are allowed in `tests/`, but they must never be counted as real dogfooding evidence.

## 0. Before the arc

1. Choose one real learner mission and one domain arc.
2. Read the current `.learning/MISSION.md`, `LEARNER.md`, `ROADMAP.md`, and `STATE.md` if they exist.
3. Copy the arc brief for the chosen domain into the local `.dogfooding/` workspace and fill only the **starting assumptions**.
4. Do not invent learner evidence, expected success, or final mastery state.
5. Identify one capability that could plausibly change during the arc.

## 1. During each session

Use the normal Teach or Study skill. Do not expose evaluation machinery to the learner unless useful.

After the interaction, copy `evaluation/SESSION.md` into the local `.dogfooding/` arc and complete it from decisive evidence only.

Capture:

- what the learner could do before;
- the learner-model hypothesis that mattered;
- the cognitive move selected;
- the learner action that tested it;
- what changed;
- what remains uncertain;
- whether the roadmap or state changed;
- any runtime failure label.

Do not copy the full transcript into the record unless there is a specific local research reason. Usually a minimized evidence excerpt or structured observation is stronger and safer.

When the session contains a genuinely delayed revisit, mark the resulting Runtime Evidence with `delay: delayed`. After completing the local `sessions/NNN.md`, capture the descriptive Review-observation snapshot for that same session:

```bash
python tools/review_checkpoints.py --repo . <arc-name>
```

This writes `.dogfooding/<arc-name>/review-observations/NNN.json`. The checkpoint is local evaluation evidence only. It is not learner state, does not assign Review priority, and cannot be overwritten for the same session.

### vNext learner-facing product observation

When the session used the AbleArc Entry / Today / DailyContext / Focus path, also create a product checkpoint for the same numbered session:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc-name>
```

Edit only fields that were actually observed, then validate them:

```bash
python tools/vnext_product_dogfood.py --repo . validate <arc-name>
```

Across repeated sessions, inspect descriptive counts with:

```bash
python tools/vnext_product_dogfood.py --repo . summary <arc-name>
```

These files live under `.dogfooding/<arc-name>/product-observations/`. They are evaluation-only and cannot create Evidence, change mastery, revise the Map, satisfy Completion, or decide whether a later product phase should be promoted. See `evaluation/VNEXT-PRODUCT-DOGFOOD.md` for the typed fields and Phase 4 gate.

## 2. Preserve longitudinal dependence

Before the next session:

- read the updated learner state;
- identify what should now be retrieved rather than retaught;
- identify one earlier assumption worth challenging;
- reduce scaffolding if prior evidence warrants it.

The next session must depend on earlier evidence. If it could have been run identically with a new learner, the arc is not yet longitudinal.

## 3. Retrieval check

A later session should test at least one earlier capability without replaying the original explanation.

Record whether the learner:

- retrieves independently;
- needs a cue;
- recognizes but cannot reconstruct;
- reconstructs but cannot apply;
- applies in the original form but fails after a representation/context change.

Use this evidence to confirm, preserve, or downgrade state. Use the session-bound Review checkpoint to preserve what the evaluator could observe at that point in the arc; do not reinterpret old sessions from the final Runtime state.

## 4. Perturbation / representation switch

When appropriate, change one meaningful dimension while preserving the underlying structure.

Examples:

- frequency tree → conditional-probability notation;
- geometric argument → symbolic derivation;
- paper prose → claim/evidence map;
- code path → state/dataflow diagram;
- verbal causal model → counterfactual scenario.

The learner should perform a translation, prediction, repair, or reconstruction. Passive viewing is not enough.

## 5. Transfer check

Use an unfamiliar case that was not demonstrated immediately before. The task should preserve the deep structure while changing enough surface cues to make pattern matching unreliable.

Record scaffold dependence explicitly.

## 6. Arc review

After the final planned session:

1. complete the outcome section in the local copy of `evaluation/ARC.md`;
2. classify runtime failures using `FAILURE-TAXONOMY.md`;
3. compare early and late learner-model hypotheses;
4. compare the session-bound Review checkpoints when delayed revisits occurred;
5. compare vNext product checkpoints when the learner-facing product path was used;
6. identify whether scaffolding actually receded;
7. identify whether apparent learning survived retrieval or transfer;
8. decide whether the evidence supports a runtime or product change.

Checkpoint comparison is descriptive. Do not turn checkpoint counts into a retention score, Review priority, scheduler rule, or product-phase promotion without passing the relevant promotion gate.

## 7. Public evidence reduction

Only if evidence justifies a repository change, prepare a minimized public case:

1. remove learner identity and unrelated personal context;
2. remove private source text or replace it with an abstract description;
3. preserve only the behavior needed to support the failure classification;
4. state whether the evidence came from one session, repeated sessions, or multiple arcs;
5. keep uncertainty explicit;
6. never present a synthetic reconstruction as the original learner interaction.

## 8. Promotion gate

Do not edit `skills/teach/SKILL.md` or `skills/study/SKILL.md` merely because an arc felt awkward.

Use `evaluation/PROMOTION.md` first. A general protocol change should normally require repeated evidence across independent sessions/arcs or a clearly structural high-consequence failure.

For Review automation specifically, first collect delayed-Evidence checkpoints from repeated real sessions. A scheduler trigger must be justified by observed retrieval/transfer patterns, not by the existence of the checkpoint tool itself.

For vNext product phases, use the same evidence discipline. The former Capture Inbox hypothesis is an explicit example of a feature that was not promoted: product checkpoints should continue to record focus/continuity failures neutrally, and any future solution must be justified from the observed behavior rather than inherited from the old roadmap.

## 9. What counts as a completed dogfood arc

A completed arc is not "three chats happened". It has:

- real learner evidence from more than one session;
- continuity through persistent state;
- at least one retrieval/revisit;
- at least one changed assumption, representation, or context when appropriate;
- a conservative capability decision;
- explicit unresolved uncertainty;
- a documented decision about whether the runtime or product should change.

If these conditions are not met, mark the arc `insufficient_evidence` and continue later rather than manufacturing closure.
