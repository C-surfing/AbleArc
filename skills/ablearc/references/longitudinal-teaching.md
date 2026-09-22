# Longitudinal teaching

This reference adapts several durable-learning ideas from Matt Pocock's `teach` Skill into AbleArc's lighter Goal → Model → Frontier → Move architecture.

Source: https://github.com/mattpocock/skills/tree/main/skills/productivity/teach

AbleArc does not reproduce the workspace/HTML-lesson product model. It keeps the learning mechanisms that remain useful in a conversational Skill.

## Mission grounding

A topic label is not enough when the learner's real goal changes what should be taught.

When the goal is ambiguous and the distinction matters, identify:

- why the learner cares;
- what they want to become able to do;
- relevant constraints;
- what is explicitly out of scope.

Keep this compact. Do not turn every session into an intake interview.

A useful mission is an observable capability, not "understand X" by itself.

## Zone of proximal development

Teach near the learner's current edge:

- below the edge → remove scaffolding, vary context, apply, or transfer;
- at the edge → preserve productive difficulty;
- above the edge → narrow the task, repair one prerequisite, or provide one more scaffold.

The frontier is AbleArc's operational version of this idea.

## Fluency vs durable access

Immediate ease can be misleading.

Distinguish:

- **current fluency** — can the learner do it while the explanation/context is still active?
- **durable access** — can the learner retrieve and use it later with less cueing?

Do not assume immediate correctness means durable learning. Use delayed retrieval when durability matters.

## Knowledge acquisition vs skill strengthening

When the learner lacks information, reduce unnecessary difficulty:

- use clear explanations;
- find high-trust sources when source fidelity matters;
- reduce irrelevant notation/search overhead.

When the learner needs capability, desirable difficulty becomes useful:

- retrieval;
- prediction;
- practice;
- debugging;
- application;
- transfer.

Difficulty should sit in the cognitive act, not in logistics.

## Source curation

For source-grounded topics, prefer a few high-trust sources over a large link dump.

Useful source priorities:

- primary documentation / papers;
- recognized experts or authoritative texts;
- well-moderated technical communities when practitioner experience matters.

Annotate mentally or explicitly what each source is good for. Search again only when a source gap changes the learning route.

## Decision-grade learning records

If persistence exists, save only non-obvious facts that should change future teaching.

Good record:

    Can explain why shared memory enables explicit cooperative reuse,
    but still confuses bank conflicts with global-memory coalescing.

Bad record:

    We studied CUDA for 45 minutes.

Useful things to preserve:

- demonstrated understanding that raises the teaching floor;
- important prior knowledge disclosed by the learner;
- a corrected misconception likely to matter again;
- a meaningful mission shift;
- decisive evidence that changes what to teach next.

Do not save coverage logs.

## Reference artifacts

A concise reference can be valuable after understanding exists:

- glossary;
- code pattern;
- algorithm;
- flowchart;
- formula sheet;
- diagram;
- compact concept note.

The artifact should compress learning, not replace it.

Use companion Skills when they produce the reference more effectively.

## Wisdom and real-world contact

Some questions are not solved by more explanation. Practitioner judgment, workflow taste, debugging instincts, design tradeoffs, or physical skills may require contact with real examples, communities, maintainers, or practice environments.

When this matters, distinguish:

- what can be taught conceptually;
- what needs real-world feedback;
- which communities/resources are trustworthy enough to recommend.

Do not force community participation when the learner does not want it.
