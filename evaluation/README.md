# AbleArc Skill evaluation

This directory exists to answer one question:

> Does AbleArc make the learner more capable over time?

The outcome is capability delta, not response length, generated notes, user praise, UI engagement, or the number of quizzes completed.

## What counts as useful evidence

A rough progression is:

    recognition < recall < explanation < application < transfer

Use it qualitatively. Do not turn it into a universal numeric mastery score.

A generated diagram, textbook, or video-derived PDF is learning context. It becomes relevant evidence only when the learner can do something with the knowledge.

## Longitudinal arcs

Prefer real arcs over isolated demo conversations:

    session 1: establish the frontier
    session 2: retrieve and extend
    session 3: change representation / assumption / context
    session 4: transfer or delayed revisit when valuable

Important questions:

- Did AbleArc identify the actual confusion?
- Did it over-question or over-explain?
- Did scaffolding recede?
- Did later retrieval survive without replay?
- Did the learner apply or transfer the idea?
- Did a companion Skill solve a real learning bottleneck?
- Did the generated artifact become useful learning material rather than an endpoint?

## Artifacts in this directory

- SESSION.md — compact record of one meaningful real session.
- ARC.md — cross-session learning arc.
- RUNBOOK.md — how to dogfood the Skill without turning study into an evaluation form.
- PROMOTION.md — evidence gate before adding general Skill rules.
- FAILURE-TAXONOMY.md — classify repeated failures before changing the core.
- DOMAINS.md — useful domain coverage.
- REPRESENTATIONS.md — evaluate whether representation changes help learning.
- REVIEW-SIGNALS.md — delayed retrieval/review observations.
- PRIVACY.md — keep real learner evidence private and minimized.
- arcs/ — reusable arc briefs.

Synthetic scenarios in tests/SKILL-BEHAVIOR.md are regression specifications, not real learner evidence.
