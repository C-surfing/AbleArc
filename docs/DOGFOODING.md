# Longitudinal Dogfooding Protocol

## Purpose

v0.1 established the teaching protocol. The next phase is controlled use against real learning arcs to discover where learner modeling and teaching decisions fail.

The project should evolve from:

```text
teaching principles
        ↓
real learner interaction
        ↓
evidence about learner-model / decision failures
        ↓
smallest justified protocol change
        ↓
stronger longitudinal learning
```

Optimize `capability_after - capability_before`, not explanation volume or conversational smoothness.

Operational evaluation lives in `../evaluation/`:

- `README.md` defines evidence standards and promotion rules;
- `SESSION.md` records one meaningful session;
- `FAILURE-TAXONOMY.md` classifies failures before fixes;
- `DOMAINS.md` defines the initial five-domain matrix;
- `REVIEW-SIGNALS.md` defines how to observe delayed retrieval before any scheduler policy is promoted.

## Longitudinal first

A single good tutoring conversation is weak evidence. Prefer arcs that revisit the same learner model across multiple sessions:

```text
session 1: locate frontier + begin model
session 2: retrieval + repair / extension
session 3: transfer + model falsification check
```

The key question is not whether the agent remembers facts about the conversation. It is whether it maintains a useful estimate of what the learner can independently do and changes teaching behavior when new evidence arrives.

## Initial domains

Run real tasks across:

1. probability and statistics;
2. mathematics;
3. paper reading;
4. programming / Agent systems;
5. conceptual learning.

The domains intentionally demand different forms of evidence. General teaching logic should improve only from patterns that survive those differences.

## What to observe

During each arc, look for:

- wrong frontier inference;
- excessive or low-value diagnosis;
- premature explanation;
- stolen discovery steps;
- weak misconception diagnosis;
- unjustified mastery promotion;
- roadmap rigidity;
- missing prerequisite discovery;
- weak longitudinal continuity;
- insufficient retrieval / transfer evidence;
- domain strategies that do not match the task;
- source or tooling friction incorrectly treated as learning difficulty.

Record decisive evidence, not a full transcript.

When a later session produces real `delay: delayed` Evidence, export the local descriptive review observations:

```bash
python tools/review_observations.py --repo .
```

Use the export to compare state-at-attempt, Evidence level/outcome, scaffolding, context, independence, and later accepted transitions across sessions. The export deliberately does not calculate review priority or a due date. Treat one observation as a hypothesis generator, not a scheduler rule.

## Iteration rule

When a failure appears:

1. classify it using `evaluation/FAILURE-TAXONOMY.md`;
2. check whether the current state model can represent it;
3. collect another independent observation when the diagnosis is uncertain;
4. identify the smallest layer that owns the failure;
5. define a behavior test that would distinguish the old and repaired behavior;
6. only then change templates or `SKILL.md`.

Do not add rules because one wording pattern failed. Do not encode topic-specific answer logic, benchmark phrases, or learner-specific hacks into the general runtime.

## State evolution before feature expansion

The first expected modifications should be to the learner model and teaching-decision logic, not infrastructure. Only after repeated real sessions justify them should the project add second-layer capabilities such as:

- spaced review scheduling;
- visual roadmap rendering;
- Obsidian / Markdown learning logs;
- researcher subagent;
- visualizer subagent.

The current Review work stops at descriptive delayed-Evidence observation. Queue ranking and scheduling remain unimplemented until repeated longitudinal evidence supports their semantics.

Complexity must be earned by observed need.

## Exit criteria for this phase

Do not declare v0.2 because files were added. A credible v0.2 candidate requires:

- multiple longitudinal arcs across all five domains;
- recorded capability-delta evidence;
- a non-trivial set of classified failures;
- at least one learner-model or teaching-decision improvement justified by repeated evidence;
- regression scenarios for promoted changes;
- no loss of the v0.1 principles: natural interaction, decision-value questions, one cognitive move at a time, conservative mastery, and learner-owned discovery.
