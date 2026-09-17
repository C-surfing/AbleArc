# Learner-state replay

Learner-state replay is a read-only projection over accepted Runtime state transitions. Its job is to answer a narrow question:

> What changed in the learner model, why was that change accepted, and which learning turn produced the supporting evidence?

It is not chat history and it is not a second learner-state store.

## Authority boundary

```text
StateProposal + StateDecision receipts
                ↓
       accepted decisions only
                ↓
     replay / diff projection
                ↓
          Workspace timeline
```

The canonical learner state remains the Runtime projection rebuilt from immutable receipts. Replay never writes a receipt, edits `runtime/state.json`, promotes mastery, changes the LearningMap, or schedules review.

Rejected state proposals are intentionally absent from learner-model diff history because they did not change the learner model. They remain available through their own decision/audit path.

## Integrity checks

`tools/learner_state_replay.py`:

- resolves the selected workspace-v0.2 Project;
- validates Workspace/Project scope on proposals, decisions, and linked turns;
- keeps only accepted `state-decision` receipts;
- requires every accepted decision to reference an existing proposal;
- checks per-concept before/after continuity across accepted transitions;
- links a transition to a Turn when that Turn explicitly lists the state decision;
- rejects a state decision that appears in more than one Turn;
- replays the latest accepted state for each concept and verifies it matches `runtime.rebuild_state()`.

Any mismatch fails closed instead of returning a plausible-looking history.

## Learner-facing projection

The Workspace exposes replay from the Session Timeline only when the learner opens it. Each event may show:

- concept label;
- accepted `before → after` learner-state change;
- authority type;
- learner/reviewer rationale;
- Evidence count;
- whether conservative Runtime policy was explicitly overridden;
- associated Turn outcome and summary, when available.

Raw Evidence IDs, receipt file paths, and chat messages are not required for the default replay surface.

## Non-goals

This slice does not add:

- transcript replay;
- speculative state changes from UI interaction;
- rejected proposals as fake learner-model changes;
- automatic review scheduling;
- a second session database;
- cross-Project learner-state merging.

Review scheduling remains a separate Layer 2 decision that should be promoted only after longitudinal use provides stable trigger semantics.
