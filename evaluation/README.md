# AbleArc evaluation

This directory exists to answer a harder question than "did the assistant give a good answer?":

> **Does AbleArc preserve or increase human capability without sacrificing useful task throughput?**

The target is not response length, generated notes, user praise, UI engagement, or quiz count.

## What counts as useful evidence

A rough capability progression is:

    recognition < recall < explanation < application < transfer

Independence matters too:

    guided → independent → changed-context transfer → delayed retrieval

Use these qualitatively. Do not convert them into a universal mastery percentage.

Generated diagrams, textbooks, PDFs, code, and passing test suites are learning context. They become capability evidence only when the learner can reason with the underlying knowledge.

## Two evaluation tracks

### 1. Real longitudinal dogfood

Use real learning/work arcs to observe:

- whether AbleArc correctly stays out of the way during Delegate work;
- whether it catches high-value Core decisions;
- whether interventions are sparse and discriminative;
- whether scaffolding recedes;
- whether later retrieval survives without replay;
- whether debugging and design become more independent;
- whether transfer survives changed assumptions or contexts.

Use:

- SESSION.md — one meaningful session;
- ARC.md — a cross-session capability arc;
- RUNBOOK.md — dogfooding procedure;
- FAILURE-TAXONOMY.md — classify repeated failures;
- PROMOTION.md — evidence gate before promoting a new Skill rule;
- PRIVACY.md — minimize private learner evidence.

### 2. Controlled baseline comparison

The benchmark skeleton in [benchmark/](benchmark/) compares:

1. foundation model only;
2. foundation model + Work × Learn prompt;
3. foundation model + AbleArc and longitudinal context.

The benchmark is intentionally a framework, not evidence by itself.

It focuses on:

- task success;
- intervention precision;
- unnecessary-interruption rate;
- missed-learning-opportunity rate;
- learner reasoning quality;
- transfer and delayed retrieval;
- scaffold dependence;
- turn/token overhead.

## Promotion rule

Do not add a general Skill rule because one conversation felt awkward.

Prefer:

    observation
    → failure classification
    → competing hypotheses
    → smallest policy change
    → regression scenario
    → real dogfood / benchmark evidence

Synthetic scenarios in tests/SKILL-BEHAVIOR.md are regression specifications, not learner-outcome evidence.
