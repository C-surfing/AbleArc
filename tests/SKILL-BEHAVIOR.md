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

## 5. Video-source material delegation

Learner:

    I am following this 70-minute YouTube CUDA lecture. Turn it into something I can study across our next few sessions.

Expected when wdkns video-render skills are available:

- choose youtube-render-pdf for a YouTube source or bilibili-render-pdf for a Bilibili source;
- preserve the video's instructional content rather than replacing it with an unrelated topic textbook;
- generate the durable note/PDF because repeated study justifies the artifact;
- afterward, use the artifact as reference context and return to active learning.

Failure:

- using University Skill when source fidelity to the provided lecture is the actual requirement;
- treating PDF generation as evidence of understanding;
- rendering an entire long video when the learner only asked about one timestamp.

## 6. Small question should stay small

Learner:

    What does ReLU do?

Expected:

- concise direct explanation;
- perhaps one small example;
- no coursebook, diagram, persistent project, or assessment ceremony.

## 7. Learner self-report accelerates routing

Learner:

    I know basic linear algebra and gradient descent; my problem is understanding why representation collapse happens.

Expected:

- use the self-report to skip redundant introductions;
- work near representation collapse;
- verify earlier knowledge only if a later teaching decision depends on it.

Failure:

- treating self-report as proven mastery;
- forcing a complete prerequisite exam.

## 8. Delayed review

Context: the learner previously explained a concept correctly and returns after several days.

Expected:

- prefer a small retrieval or reconstruction before replay when useful;
- do not automatically downgrade the learner because time passed;
- repair only what retrieval reveals.

## 9. Wrong answer is not a full reset

Learner makes one incorrect step in a derivation.

Expected:

- locate whether the error is algebraic, conceptual, or prerequisite;
- repair the smallest failing piece;
- let the learner continue the derivation.

Failure:

- replacing the entire derivation with a model answer;
- restarting from first principles unnecessarily.

## 10. Code execution has a reason

Context: the learner asks why a language or runtime behavior occurs.

Expected:

- reason first when the behavior is clear;
- execute a minimal experiment when it resolves real uncertainty or tests a prediction.

Failure:

- running code on every technical turn merely because a tool exists.

## 11. Natural session close

Context: the learner has completed one coherent unit and another immediate repetition would add little.

Expected:

- summarize only what is useful;
- identify the next frontier if helpful;
- allow the session to end;
- do not invent a completion badge or force another quiz.

## 12. No hidden infrastructure requirement

Fresh environment contains only the AbleArc Skill.

Expected:

- normal learning works;
- no MCP server, Web app, provider setup, database, Python runtime ledger, or receipt chain is required.

## 13. Companion unavailable

Context: Archify or University Skill is not installed.

Expected:

- continue learning with a smaller inline alternative;
- optionally mention the richer capability only if useful;
- never block the learner on installation.


## 14. Mission grounding should stay lightweight

Learner:

    Teach me Rust.

Expected:

- if the intended capability materially changes the route, ask at most one compact question about what the learner wants to become able to do;
- once a concrete capability is known, teach toward it rather than following a generic chapter sequence;
- do not require a mission file or workspace setup before teaching.

Failure:

- a long intake questionnaire;
- treating "learn Rust" as sufficient forever when the learner's real goal would change sequencing;
- blocking the first useful teaching move on mission formalization.

## 15. Immediate fluency is not durable access

Context: the learner answers correctly immediately after seeing the explanation.

Expected:

- treat the answer as useful local evidence;
- do not equate it with durable mastery;
- when durability matters, revisit later with reduced cueing or a changed representation/context;
- persist only a concise decision-grade note if it will improve future teaching.

Failure:

- declaring the concept mastered from immediate imitation;
- forcing an immediate second quiz only to manufacture evidence;
- writing a session log instead of a teaching-relevant learner note.
