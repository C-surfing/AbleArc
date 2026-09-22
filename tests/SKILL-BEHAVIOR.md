# AbleArc Skill behavior scenarios

These are acceptance scenarios for the Skill-first architecture.

They test teaching behavior rather than Runtime implementation.

## 1. Direct question should be answered

Learner:

    Why can CUDA shared memory help if L1 cache already exists?

Expected:

- answer the question directly;
- explain controllable reuse, tiling, and cooperation where relevant;
- do not begin with a knowledge questionnaire;
- optionally use one probe only if it changes the next teaching move.

Failure:

- asking what the learner knows before answering;
- immediate multi-question assessment;
- automatic mastery workflow.

## 2. Diagnose one misconception

Learner:

    So shared memory is basically a larger L1 cache.

Expected:

- identify the inaccurate relation;
- contrast software-managed shared memory with hardware-managed cache;
- use one discriminative example or prediction;
- avoid restarting the full GPU memory hierarchy.

## 3. Visual delegation

Context: the learner repeatedly loses the information flow in a mechanism with several interacting components.

Expected when Archify is available:

- AbleArc has a concrete visual learning purpose;
- delegates a bounded workflow, dataflow, lifecycle, architecture, or learning map;
- returns to active learning after the diagram;
- asks the learner to trace, predict, reconstruct, or explain something from it.

Failure:

- generating a diagram for decoration;
- treating "diagram created" as understanding.

## 4. Substantial material delegation

Learner:

    I want a reusable structured introduction to JEPA that I can read alongside our sessions.

Expected when University Skill is available:

- choose university-textbook unless the learner clearly wants deep coursebook scope;
- give the generation request useful learner context and target capability;
- after generation, continue AbleArc learning instead of ending with the artifact.

Failure:

- AbleArc reimplements a large textbook pipeline;
- automatically chooses 40+ pages;
- marks the topic learned because the PDF exists.

## 5. Small question should stay small

Learner:

    What does ReLU do?

Expected:

- concise direct explanation;
- perhaps one small example;
- no coursebook, diagram, persistent project, or assessment ceremony.

## 6. Learner self-report accelerates routing

Learner:

    I know basic linear algebra and gradient descent; my problem is understanding why representation collapse happens.

Expected:

- use the self-report to skip redundant introductions;
- work near representation collapse;
- verify earlier knowledge only if a later teaching decision depends on it.

Failure:

- treating self-report as proven mastery;
- forcing a complete prerequisite exam.

## 7. Delayed review

Context: the learner previously explained a concept correctly and returns after several days.

Expected:

- prefer a small retrieval or reconstruction before replay when useful;
- do not automatically downgrade the learner because time passed;
- repair only what retrieval reveals.

## 8. Wrong answer is not a full reset

Learner makes one incorrect step in a derivation.

Expected:

- locate whether the error is algebraic, conceptual, or prerequisite;
- repair the smallest failing piece;
- let the learner continue the derivation.

Failure:

- replacing the entire derivation with a model answer;
- restarting from first principles unnecessarily.

## 9. Code execution has a reason

Context: the learner asks why a language or runtime behavior occurs.

Expected:

- reason first when the behavior is clear;
- execute a minimal experiment when it resolves real uncertainty or tests a prediction.

Failure:

- running code on every technical turn merely because a tool exists.

## 10. Natural session close

Context: the learner has completed one coherent unit and another immediate repetition would add little.

Expected:

- summarize only what is useful;
- identify the next frontier if helpful;
- allow the session to end;
- do not invent a completion badge or force another quiz.

## 11. No hidden infrastructure requirement

Fresh environment contains only the AbleArc Skill.

Expected:

- normal learning works;
- no MCP server, Web app, provider setup, database, Python runtime ledger, or receipt chain is required.

## 12. Companion unavailable

Context: Archify or University Skill is not installed.

Expected:

- continue learning with a smaller inline alternative;
- optionally mention the richer capability only if useful;
- never block the learner on installation.
