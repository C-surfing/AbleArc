# User-first product discipline

`ai4learning` can easily become an elegant learner-model system that nobody can actually learn with. This document sets a product constraint: infrastructure is justified only when it improves a learner action, preserves trustworthy continuity, or makes learning outcomes evaluable.

## The shortest complete path

A learner should be able to complete this loop without understanding the runtime:

```text
open current mission
  → understand where I am
  → perform one worthwhile cognitive action
  → know that my response was received
  → return to an adapted next move
```

The Workspace must foreground the action, representation, and feedback. Decision IDs, receipt kinds, policy checks, and state revisions are inspectable implementation details, not navigation concepts.

## What we borrowed from open source

These projects are references, not architectures to copy wholesale.

### OpenTutor

[OpenTutor](https://github.com/zijinz456/OpenTutor) defines a short demo path from material to tutor question, practice, review suggestion, and export. Its useful lesson is the complete learner journey and local-first posture. Its large block catalog, multi-agent system, BKT, knowledge graph, scheduler, and ingestion stack are not current requirements for ai4learning.

### assistant-ui

[assistant-ui](https://github.com/assistant-ui/assistant-ui) treats messages, tools, generative UI, and human approval as parts of one interaction surface. The useful lesson is co-location: a learner should act where the relevant representation and question appear. ai4learning should keep its own learning semantics rather than adopt a generic chat abstraction as learner state.

### LearnHouse

[LearnHouse](https://github.com/learnhouse/learnhouse) places generated playgrounds, simulations, diagrams, and code within learning content. The useful lesson is that an artifact should be editable/interactive and adjacent to the argument that uses it. “Generate HTML” is not itself a learning objective.

### Dialogue-KT and deterministic tutor engines

[Dialogue-KT](https://github.com/umass-ml4ed/dialogue-kt) shows the value of per-turn knowledge-component and correctness annotations for later evaluation. [NavyashreeNS/ai-tutor](https://github.com/NavyashreeNS/ai-tutor) demonstrates abstaining from uncertain misconception classification and enforcing pedagogical invariants outside free-form generation. These support conservative evidence handling; they do not justify adding online BKT or a larger model stack yet.

## Architecture budget

Before adding an internal subsystem, answer all three:

1. Which learner-visible action or continuity failure does it improve now?
2. What is the smallest end-to-end slice that tests that claim?
3. What evidence would tell us to remove or revise it?

Default decisions:

- prefer one complete learning loop over several disconnected capabilities;
- prefer typed learning surfaces over raw generated HTML;
- hide internal state machinery until the learner asks for an explanation;
- let uncertain evidence remain uncertain;
- add scheduling, knowledge tracing, or more agents only after longitudinal use identifies a repeated need;
- do not count a dashboard view as a learning interaction.

## Current slice

The first user-facing runtime bridge activates the existing **Your move** surface. A learner can submit one response to the current structured decision. The response is stored locally as an observation and visibly acknowledged, but it is not auto-graded and does not auto-promote mastery.

This deliberately stops before model transport. It proves the UI/runtime boundary and preserves the learner's action without coupling the product to a provider. The next slice should consume that observation, return information-rich feedback, and select the next move through the Teach/Study protocol.
