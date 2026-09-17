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

The report MUST NOT contain or infer:

- review priority;
- a scalar retention score;
- next-review time / due date;
- automatic queue membership;
- a mastery transition not already accepted by Runtime authority;
- a cross-Project learner score.

The marker `descriptive_only_no_review_priority` exists to make that boundary
machine-visible as well as documented.

## How to use it

During a real longitudinal arc:

1. Teach / Study normally.
2. Let Runtime record Evidence and accepted learner-state changes normally.
3. Revisit the concept later with a retrieval, explanation, application, or
   transfer task that is actually delayed.
4. Record that attempt as Evidence with `delay: delayed`.
5. Export observations locally.
6. Compare patterns across repeated sessions and, preferably, multiple arcs.
7. Only after repeated evidence exists, propose a review-trigger hypothesis in
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

The export is intended for local dogfooding. It contains local receipt ids and
concise result summaries, so do not commit real learner exports to the
repository. `.learning/` remains the source of learning truth and
`.dogfooding/` remains local evaluation state by default.
