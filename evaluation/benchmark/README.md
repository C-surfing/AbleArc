# AbleArc baseline benchmark

This directory defines a controlled comparison framework for the project's central product question:

> **What does AbleArc add beyond a strong foundation model and a good Work × Learn prompt?**

This benchmark is a **protocol skeleton**. Empty result tables are not evidence.

## Conditions

Run the same scenario under three conditions:

1. **Base model** — normal high-quality assistant behavior.
2. **Work × Learn prompt** — base model plus the standalone Work × Learn protocol.
3. **AbleArc** — canonical AbleArc policy plus the same task context and any explicitly allowed longitudinal state.

See [conditions/](conditions/).

## Scenario families

Initial scenarios cover:

- CUDA debugging;
- architecture decisions;
- paper-to-implementation learning;
- research hypothesis formation.

See [scenarios/](scenarios/).

## Primary questions

### Delivery

- Was the real task completed?
- Was the result correct enough for the scenario?
- How many turns/tokens were consumed?
- Did learning friction delay low-value execution?

### Learning-control precision

- **False-positive intervention:** AbleArc interrupted when direct execution would have been better.
- **False-negative intervention:** AbleArc delegated a high-value ownership decision the learner should have retained.
- Was the intervention discriminative?
- Did it reveal information that changes the learner model?

### Capability

Where the scenario permits:

- independent explanation;
- prediction quality;
- debugging hypothesis quality;
- application/modification;
- transfer;
- delayed retrieval;
- scaffold dependence.

## Run discipline

Do not compare outputs from different task statements.

Keep constant where possible:

- model;
- model settings;
- source material;
- tool access;
- task prompt;
- success criteria.

Vary only the condition.

Randomize condition order when human learning from one run could contaminate another.

## Minimum useful result

A benchmark result should include:

- scenario;
- model/version;
- condition;
- task outcome;
- intervention events;
- learner actions;
- rubric judgments;
- confounds;
- uncertainty.

Do not collapse the whole result into a single "AbleArc score".
