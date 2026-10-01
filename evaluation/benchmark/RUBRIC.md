# Benchmark rubric

Use qualitative evidence first. Numeric summaries may be added later only if they preserve the meaning of the underlying events.

## 1. Task utility

Record:

- **completed** / **partial** / **failed**;
- correctness evidence;
- notable execution overhead.

## 2. Intervention precision

For each candidate learning moment classify the control decision:

| Control decision | Interpretation |
| --- | --- |
| correct non-intervention | AI executed low-value work directly |
| correct intervention | learner reasoning was worth preserving |
| false-positive intervention | unnecessary tutoring friction |
| false-negative intervention | high-value human judgment was silently outsourced |

The benchmark should report the event counts, not just a ratio.

## 3. Learner reasoning evidence

Classify the strongest observed behavior:

    recognition
    recall
    explanation
    application
    debugging
    transfer

Also record support:

    model-provided
    strongly scaffolded
    lightly scaffolded
    independent

## 4. Feedback quality

When prediction/debugging is used, check whether the loop contains:

    hypothesis or prediction
    → discriminating experiment/evidence
    → observation
    → explicit model update

## 5. Understanding debt

Record whether the learner could still answer:

- why the relevant code/design exists;
- what invariant must hold;
- what is most likely to fail;
- what signal would distinguish competing failures.

## 6. Overhead

Record at minimum:

- turns;
- approximate input/output tokens if available;
- number of explicit learning interruptions.

Do not optimize overhead independently of task correctness or capability.

## 7. Final interpretation

Prefer statements such as:

> AbleArc reduced false-negative delegation in architecture decisions but added two false-positive interruptions during setup.

Avoid:

> AbleArc scored 8.7/10.
