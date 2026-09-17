# Review-signal observation protocol

Spaced Review is intentionally evidence-deferred. Before ai4learning defines a
review priority score or scheduler, it needs longitudinal observations showing
which combinations of learner state and prior Evidence actually survive or fail
a delayed revisit.

This document defines the **observation layer**, not the scheduling policy.

## Unit of observation

One row is:

```text
one delayed Evidence receipt × one referenced concept
```

The local export command is:

```bash
python tools/review_observations.py --repo .
```

The report is derived from existing immutable Runtime receipts. It does not
create new learner state or evaluation receipts.

## Session-bound checkpoints

A live export changes as later Evidence and accepted state transitions appear.
For longitudinal comparison, capture the current descriptive report at the end
of a meaningful dogfooding session:

```bash
python tools/review_checkpoints.py --repo . <arc-name>
```

The tool resolves `<arc-name>` under `.dogfooding/`, finds the latest numbered
session record, and writes exactly one local checkpoint:

```text
.dogfooding/<arc-name>/
├── sessions/
│   ├── 001.md
│   └── 002.md
└── review-observations/
    ├── 001.json
    └── 002.json
```

A checkpoint is a **non-authoritative evaluation snapshot**. It stores the
current descriptive report together with the arc id, session id, selected
Project id, Runtime revision, and capture time. It never writes `.learning/`,
creates Runtime receipts, or becomes a learner-state source of truth.

The same session checkpoint cannot be overwritten. If a later session changes
the evidence picture, create the next `sessions/NNN.md` first and capture a new
`review-observations/NNN.json`. This preserves what the evaluator could actually
observe at each point in the longitudinal arc instead of rewriting history from
the final state.

## What the export records

For each delayed Evidence observation, the export may include:

- Project and Runtime revision;
- Evidence id and timestamp for local audit;
- concept id / label;
- accepted learner state immediately before the delayed attempt;
- timestamp/id of the previous accepted state transition when one exists;
- Evidence level and recorded outcome;
- scaffolding, context, and independence dimensions;
- concise Evidence result summary;
- linked Turn summary when the Turn explicitly contains that Evidence;
- any later accepted state transition that explicitly cites this Evidence.

Immediate Evidence is excluded. It is useful for acquisition and verification,
but it does not answer the longitudinal review question this dataset is meant
to study.

## What the export does not produce

The report and its checkpoints MUST NOT contain or infer:

- review priority;
- a scalar retention score;
- next-review time / due date;
- automatic queue membership;
- a mastery transition not already accepted by Runtime authority;
- a cross-Project learner score.

The marker `descriptive_only_no_review_priority` exists to make that boundary
machine-visible as well as documented. Checkpoint capture fails closed if that
marker is absent or changed.

## How to use it

During a real longitudinal arc:

1. Teach / Study normally.
2. Let Runtime record Evidence and accepted learner-state changes normally.
3. Revisit the concept later with a retrieval, explanation, application, or
   transfer task that is actually delayed.
4. Record that attempt as Evidence with `delay: delayed`.
5. Complete the current `sessions/NNN.md` from decisive evidence.
6. Capture `review-observations/NNN.json` for that session.
7. Compare checkpoints across repeated sessions and, preferably, multiple arcs.
8. Only after repeated evidence exists, propose a review-trigger hypothesis in
   evaluation notes and test whether it predicts useful retrieval needs.

Do not fit a scheduler to one Bayes example or one learner. The dogfooding
promotion rule still applies: repeated evidence or a clearly structural failure
must justify the next protocol change.

## Interpretation examples

Useful observations may eventually reveal patterns such as:

- `developing` after only same-form immediate Evidence often contradicts on a
  delayed revisit;
- independent explanation Evidence survives delayed retrieval better than
  recognition-only evidence;
- a novel-context transfer success may make another same-form review low value.

Those are **hypotheses to test**, not rules encoded by this export. The tool
preserves the dimensions needed to evaluate such hypotheses without choosing a
winner in advance.

## Privacy and storage

The export and checkpoints are intended for local dogfooding. They contain
local receipt ids and concise result summaries, so do not commit real learner
exports to the repository. `.learning/` remains the source of learning truth and
`.dogfooding/` remains local evaluation state by default.
