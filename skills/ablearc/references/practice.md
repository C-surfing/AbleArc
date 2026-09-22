# Practice progression

Practice should reveal understanding, not merely produce more questions.

## Core pattern

Prefer connected tasks:

    establish a base case
    → change one meaningful condition
    → predict what follows
    → explain why
    → verify / implement / transfer

This makes it easier to see which assumption, representation, or mechanism caused the result to change.

## Three scales

### Immediate check

Use a short task after a new cognitive move when it can expose a local misconception.

### Connected progression

Reuse the same model, program, proof object, dataset, derivation, or conceptual case. Change one thing at a time:

- weaken an assumption;
- alter a boundary condition;
- switch representation;
- compare methods;
- add a constraint or noise;
- inspect a limiting case;
- reverse an inference;
- construct a counterexample.

### Synthesis / transfer

Later, remove local cues and require the learner to decide which idea applies in a changed setting.

## Hold the object fixed; vary the reason

A strong sequence often keeps the target object constant while changing the reasoning demand.

Example:

    same software component
    → predict behavior
    → inspect state flow
    → introduce failure
    → debug from evidence
    → change architecture constraint

## Match practice to evidence

- recognition → discriminate nearby concepts;
- recall → reconstruct without cues;
- explanation → justify mechanism;
- application → use in a representative case;
- transfer → recognize and use the structure after surface changes.

Length is not evidence strength.

## Worked example → learner decision

A worked example should make the method intelligible, then hand the important decision back to the learner. Avoid near-copy exercises that only change numbers.

A useful transition is:

    model one decision
    → leave the next consequential decision to the learner
    → inspect the learner's reasoning
    → fade support

## Progressive hint ladder

Hints should reduce search space without performing the central inference too early.

Escalate only as needed:

    0. retry / give space
    1. reframe the problem
    2. constrain the search space
    3. point to the relevant principle or representation
    4. provide partial structure
    5. demonstrate a local fragment
    6. give the full explanation when that is now the best move

Do not force every learner through every rung.

The lowest level of support that restores useful reasoning is evidence. Treat hint dependence as local routing information, not a permanent mastery score.

## Misconception-aware practice

When a wrong response could arise from several nearby models, do not immediately reveal the correct answer.

Prefer a contrast or discriminative question whose outcomes separate the likely generators.

For multiple-choice or contrastive tasks, wrong options should represent plausible misconceptions when practical—not random distractors.

## Programming practice

For programming, prefer milestones that leave the key implementation or debugging decision to the learner.

Run code only when it tests a specific claim, learner prediction, or runtime behavior. Do not generate the finished project as a substitute for the learner building it.

## Failure signals

A practice sequence is weak when every task repeats the same procedure, the prompt names the method to use, hints remove the key decision, distractors are meaningless, or difficulty comes from wording or bookkeeping rather than reasoning.
