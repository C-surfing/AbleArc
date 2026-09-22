# AbleArc Evidence Policy

Use this before calling `commit_learning_turn`.

## Evidence levels

```text
recognition
< recall
< explanation
< application
< transfer
```

- recognition — identify/select when the structure is already visible;
- recall — reconstruct relevant knowledge without seeing the answer;
- explanation — explain the mechanism or relation coherently;
- application — use the idea to solve a representative problem;
- transfer — recognize and use the structure in a meaningfully new context.

Do not choose a higher level because the response is eloquent.

## Outcome

- `supports` — observed performance supports the current local hypothesis;
- `contradicts` — performance materially contradicts it;
- `inconclusive` — the action does not justify either conclusion.

Supporting evidence must use `failure_mode=none`.

Contradicting evidence must identify a specific failure mode.

## Scaffolding

- `none` — no material cue beyond the task itself;
- `light` — hint, partial structure, or local cue;
- `heavy` — worked structure, strong prompting, or substantial guidance.

Scaffolding changes the strength of evidence. It does not make a correct answer "wrong".

## Context

- `same` — materially the same representation/problem context;
- `varied` — changed representation or nearby case;
- `novel` — structurally related but meaningfully unfamiliar context.

## Delay

- `immediate` — performance occurs in the same local learning window;
- `delayed` — meaningful time/session separation exists.

Do not pretend a delay occurred.

## Independence

- `same_form` — response follows the same form or scaffold;
- `new_form` — learner reconstructs in a changed form;
- `independent` — learner generates the needed reasoning without relying on the teaching representation.

## Artifact form

Classify what the learner actually produced:

- prose;
- pseudocode;
- code;
- executed_code;
- diagram.

A code block that was not actually executed is `code`, not `executed_code`.

## Confidence

Confidence is confidence in this **assessment of the observed action**, not confidence in the learner as a person.

Use low/medium/high conservatively.

## Mastery boundary

The plugin does not directly promote mastery.

Runtime/state authority decides whether Evidence is sufficient for a state change.

One immediate correct response is not stable mastery. Transfer requires genuine new-context evidence.

## Self-report

"I know this", "I am bad at this", confidence ratings, and prior-exposure claims are useful routing context.

They are not Evidence until learner behavior supports them.
