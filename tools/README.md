# Local runner

`tools/learning.py` is a small standard-library helper for ai4learning's local workspace and longitudinal evaluation. `tools/runtime.py` records the structured learning transaction selected by Teach/Study agents. Neither tool teaches, scores learners, or selects cognitive moves.

Its job is to remove bookkeeping friction while preserving the project's privacy and evidence boundaries.

## Initialize learner state

```bash
python tools/learning.py init
```

Creates missing files from `templates/` under `.learning/`, `records/`, `references/`, and the local structured runtime. Existing learner files are never overwritten.

## Record structured learning transactions

The receipt runtime preserves this inspectable chain:

```text
decision → observation → evidence → state proposal → authority decision → turn
```

Initialize it directly when needed:

```bash
python tools/runtime.py --repo . init
```

The full command contract, authority rules, privacy boundary, and JSON schema are documented in [`../docs/RUNTIME-CONTRACT.md`](../docs/RUNTIME-CONTRACT.md).

Learner-facing clients should normally use the high-level response façade:

```bash
python tools/runtime.py --repo . respond <decision-id> -
```

It reads response text from stdin and derives concept/action context from the decision. The lower-level `record` commands exist for agents and debugging, not for learners.

Agents can consume the next unanswered response and advance the learning loop without manually assembling receipts:

```bash
python tools/runtime.py --repo . pending
python tools/runtime.py --repo . advance <decision-id> assessment.json
```

`advance` validates the assessment and next move before writing anything, then records feedback as evidence, closes the completed turn, and grounds the next decision in that evidence. It does not change mastery state.

Create a validated learner-operable representation:

```bash
python tools/runtime.py --repo . artifact examples/learning-artifacts/bayes-frequency-tree.json
```

The returned `artifact_ref` can be attached to a Decision representation. Artifacts live outside the receipt ledger and never update learner state.

## Start a real longitudinal arc

```bash
python tools/learning.py start-arc probability bayes-base-rate
```

Available domains:

```text
probability
mathematics
paper-reading
programming-agent
conceptual
```

The command initializes `.learning/` if necessary, then creates a dated directory under `.dogfooding/` containing:

```text
BRIEF.md
ARC.md
README.md
sessions/
└── 001.md
```

The files are copies of the public evaluation templates. Filled learner evidence remains local because `.dogfooding/` is Git-ignored by default.

Working names may contain Unicode, for example:

```bash
python tools/learning.py start-arc probability 贝叶斯直觉
```

## Add the next session

```bash
python tools/learning.py new-session 20260905-probability-bayes-base-rate
```

This creates the next numbered record (`002.md`, `003.md`, ...). Existing evidence is never replaced.

## Inspect local status

```bash
python tools/learning.py status
```

Shows whether `.learning/` exists and lists local arcs with their number of session records. It does not parse or print learner evidence.

## Check repository invariants

```bash
python tools/learning.py doctor
```

Checks that required templates, evaluation contracts, five domain briefs, and the `.learning/` / `.dogfooding/` privacy ignores are present.

## Tests

The runner uses only the Python standard library:

```bash
python -m unittest discover -s tests -p 'test_*.py'
python tools/learning.py doctor
python tools/runtime.py --repo . verify
```

GitHub Actions runs both checks on pushes and pull requests.

## Boundary

Keep these tools deliberately boring. New commands should remove repeated operational friction or enforce an important audit invariant, not move teaching policy into Python. Learner-model inference, cognitive-move selection, roadmap revision, and representation choice remain responsibilities of the Teach/Study protocol. The runtime may reject unsafe state transitions, but it never auto-promotes mastery.
