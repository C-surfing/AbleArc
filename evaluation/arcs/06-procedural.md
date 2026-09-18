# Arc 06 — Procedural / Skill Acquisition

Use this arc when the target is to **perform or produce something reliably**, not primarily to understand an existing codebase.

Examples:

- implement a data structure or algorithm;
- learn language syntax by using it;
- write a proof pattern;
- operate a technical tool;
- execute a repeatable analytical procedure.

## Mission shape

The learner should become able to produce the target artifact or procedure independently, explain the structural reason for the important steps, diagnose meaningful failures, and adapt the skill to a nearby case.

For programming Missions, distinguish this arc from `programming-agent`: procedural learning starts from acquiring the skill itself; programming/Agent systems starts from modeling and changing an existing system.

## Target capability

Perform the procedure with decreasing scaffolding, predict important outcomes before verification, diagnose failures from violated structure, and transfer the skill across a boundary or neighboring form.

## S1 — smallest viable performance

Start from zero or the smallest representative artifact that can expose the target structure.

For executable work:

1. ask the learner to predict the expected behavior or invariant;
2. let the learner produce the smallest code/command/procedure;
3. execute only when the result is useful Evidence or resolves a material uncertainty;
4. compare the observed result with the prediction.

A runnable artifact is stronger Evidence than prose only when the Mission actually requires performance. Do not turn execution into a ritual.

## S2 — essential structure vs hygiene

Change one thing at a time: remove a line, reverse a condition, alter an update order, change a proof step, or omit one operation.

Ask the learner to predict the consequence before running or checking the variant. Use the contrast to separate:

- steps required for semantic correctness;
- defensive or hygiene practices;
- style/convention;
- accidental details of the original example.

The learner should explain **why** a variant changes behavior rather than memorize a canonical sequence.

## S3 — failure-mode contrast

Use failures that expose different violated structures when appropriate:

- wrong but plausible output;
- silent invariant corruption;
- compile/type error;
- nontermination;
- crash or invalid memory access;
- boundary-only failure.

Ask the learner to connect the observable symptom to the broken invariant, dependency, or procedure step. Prefer discriminative diagnosis over patch guessing.

Record Runtime `failure_mode` when the evidence warrants it. For example, distinguish a local procedural gap from a wrong causal model, overgeneralization, or failed transfer.

## S4 — boundary and neighboring transfer

Change a meaningful dimension while preserving enough deep structure to require adaptation rather than a fresh tutorial.

Examples:

- singly linked → doubly linked;
- no sentinel → sentinel node;
- ordinary case → empty/singleton/boundary case;
- one loop invariant → a neighboring algorithm using the same invariant;
- one command sequence → a changed environment or input shape.

Require a prediction before verification when prediction is part of the capability. Transfer is stronger when the learner decides what must change rather than merely editing a copied solution.

## Evidence expectations

Record what the learner actually produced through Evidence `artifact_form`:

- `prose`;
- `pseudocode`;
- `code`;
- `executed_code`;
- `diagram`.

A Mission that requires implementation or operation should configure Completion criteria with the appropriate `artifact_forms`; prose about code must not satisfy “can write code”. Use `executed_code` only when concrete execution evidence exists.

## Runtime questions

- Did the learner predict before execution when prediction was instructionally useful?
- Did the tutor execute code simply because a tool existed, or because execution resolved an uncertainty / validated performance?
- Can the learner distinguish essential structure from hygiene and convention?
- Can they diagnose the failure from the violated invariant rather than patch by resemblance?
- Did scaffolding decrease across attempts?
- Did the learner adapt the procedure at a boundary or neighboring structure?
- Does Completion require the artifact form that the Mission actually promises?

## Verification policy

Default to reasoning first. Run/build/test when the result can resolve a material uncertainty, validate the learner's concrete artifact, or expose a mechanism that prose cannot establish efficiently.

Do not turn every procedural-learning turn into a terminal session.

## Exit evidence

A strong arc ends with the learner independently producing the target form, explaining its important invariants or dependencies, diagnosing at least one meaningful failure, and adapting the procedure to a non-identical case. When the Mission promises executable performance, at least one qualifying Evidence receipt should be `code` or `executed_code` according to the configured Completion contract.
