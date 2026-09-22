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


## 16. High-information assessment is precommitted

Context: AbleArc asks the learner to explain why CUDA tiling helps after a substantial explanation.

Expected:

- before evaluating the response, the intended evidence target is stable: e.g. reuse, reduced global-memory traffic, and block cooperation where relevant;
- the learner is not rewarded merely for repeating surface vocabulary;
- the success criterion is not silently loosened or tightened after seeing the answer;
- no formal rubric artifact is required for a small conversational check.

Failure:

- moving the goalposts after seeing the answer;
- treating eloquence as proof of the target mechanism;
- creating assessment paperwork for every probe.

## 17. Hint ladder preserves the key inference

Context: the learner is stuck on a programming or derivation step.

Expected:

- begin with the least intrusive useful intervention;
- escalate from reframe → constrain → point → partial structure → local demonstration → full explanation only as needed;
- leave the key inference to the learner whenever they can still make it;
- use required hint strength as local evidence for the next move.

Failure:

- immediately giving the decisive line of code or derivation;
- withholding explanation indefinitely when stronger help is clearly needed;
- converting hint level into a permanent numeric mastery score.

## 18. Wrong answer triggers discriminative diagnosis

Learner gives an answer that could come from either confusing cache with shared memory or misunderstanding block-level cooperation.

Expected:

- form a small set of plausible generators;
- ask one question or contrast that distinguishes them;
- repair the identified generator;
- return to the original task.

Failure:

- explaining every possible misconception at once;
- correcting only the surface sentence without updating the causal model.

## 19. Source-bounded and source-augmented stay distinct

Context: the learner provides a course slide deck and asks to learn from it.

Expected:

- if the learner wants fidelity, use source-bounded mode and avoid silently importing outside claims;
- if outside context is useful and allowed, use source-augmented mode;
- distinguish source claim, tutor synthesis, and learner application;
- preserve the source as primary when that is the learner's intent.

Failure:

- presenting external explanation as if it came from the supplied source;
- refusing all clarification merely because the session is source-bounded.

## 20. Programming project companion leaves work to the learner

Learner:

    I want to actually learn Rust async by building something, not just read explanations.

Expected when iannbing/skills-for-learning is available:

- use a minimal tutorial/project scaffold with meaningful milestones;
- use progressive guide-style hints when blocked;
- keep implementation decisions with the learner;
- let AbleArc use the learner's work as evidence and choose the next frontier.

Failure:

- generating the completed project;
- replacing the learning arc with a giant tutorial document;
- invoking the companion for a tiny conceptual question.

## 21. Large corpus does not become learner state

Context: the learner has a technical book, documentation set, and several papers that will be used across many sessions.

Expected when corpus-to-skill is available:

- use it only if reusable corpus extraction materially reduces repeated source-navigation overhead;
- preserve frameworks, decision rules, examples, trade-offs, and failure modes as appropriate;
- keep corpus knowledge separate from the learner model;
- continue to judge learning from learner action.

Failure:

- copying the corpus into persistent learner state;
- using corpus conversion for a single short document;
- treating corpus ingestion as evidence of learning.
