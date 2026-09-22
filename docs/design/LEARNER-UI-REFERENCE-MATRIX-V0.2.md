# AbleArc Learner UI Reference Matrix v0.2

Status: **canonical reference for the current Web redesign experiment**

This document converts external product research into deterministic AbleArc UI rules.
It is not a moodboard. Every cited reference must resolve into a concrete product rule,
a component rule, or a rejection rule.

## Reference products

### Brilliant — primary learning interaction reference

Official sources:

- https://brilliant.org/about/
- https://brilliant.org/help/features/what-are-learning-paths/
- https://brilliant.org/help/features/how-do-i-use-interactives-on-brilliant/
- https://blog.brilliant.org/a-world-class-tutor-in-every-home/
- https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/

What we borrow:

1. **One concept / one meaningful task at a time.**
   Brilliant explicitly describes lessons as focusing on a single concept and mixing direct
   instruction with blocked problem solving.
2. **Attempt before procedure when productive.**
   Brilliant describes pretesting before teaching the procedure.
3. **Visual / interactive object before dense prose.**
   Interactives include dragging, direct manipulation, structured input, diagrams, and
   immediate custom feedback.
4. **Progressive path, not topology dump.**
   Learning Paths give a recommended sequence and checkpoints; the learner does not need the
   full dependency graph during every problem.
5. **Tutor support is contextual.**
   Koji can point, annotate, highlight, or ask an intermediate question inside the lesson.
   Help is attached to the current object rather than rendered as a permanent diagnostic wall.

What we explicitly do **not** copy:

- Brilliant branding, logo, illustrations, characters, or proprietary components;
- XP / leagues / streak pressure as learner-truth signals;
- fixed course sequencing as AbleArc authority.

### Codecademy — workbench/navigation separation reference

Official sources:

- https://help.codecademy.com/hc/en-us/articles/1260803449210-Updates-to-our-Learning-Environment
- https://help.codecademy.com/hc/en-us/articles/23368252603163-Tools-within-the-Learning-Environment

Useful pattern:

- course/syllabus navigation is available through a dedicated control;
- the active exercise/editor remains the work surface;
- Back / Next controls are predictable and separated from the instruction content.

AbleArc translation:

- Path, Inspect, and History are explicit controls;
- they do not occupy permanent columns by default;
- the current cognitive move owns the center.

### Khan Academy — mastery inspection separation reference

Official source:

- https://www.khanacademy.org/khan-for-educators/khan-for-educators-advanced-course/x2e5750eab575b791%3Akhan-for-educators-advanced/x2e5750eab575b791%3Ausing-ka-reports-to-personalize-learning/a/review-student-progress-toward-mastery-a9

Useful pattern:

- mastery/progress reporting is a dedicated inspection/reporting surface rather than a permanent
  part of every learner exercise.

AbleArc translation:

- Evidence ladder, Decision trace, accepted learner state, misconceptions, and proposal review
  live behind **Inspect** during ordinary learning;
- they remain fully available and authoritative.

## Design-process references

### taste-skill

Repository: https://github.com/Leonxlnx/taste-skill

Adopted controls:

- `DESIGN_VARIANCE = 3` — calm, structured learning UI;
- `MOTION_INTENSITY = 2` — only feedback/state transitions;
- `VISUAL_DENSITY = 4` — enough context for learning without cockpit density;
- cards only when containment communicates hierarchy;
- one radius system;
- one primary CTA intent per step;
- desktop navigation remains one line when space permits;
- explicit mobile collapse.

### huashu-design

Repository: https://github.com/alchaincyf/huashu-design

Adopted process:

- references and real product context outrank style-library defaults;
- visual decisions require a reason, not a generic AI aesthetic;
- typography and color are audited explicitly;
- rendered output is checked with Playwright / screenshots rather than accepting a passing build.

## Deterministic desktop spec

### Global shell

| Element | Rule |
| --- | --- |
| top bar | 64 px |
| default page background | `#F7F7F4` |
| primary learning surface | `#FFFFFF` |
| primary text | `#232323` |
| divider | `#DFDFD8` |
| main CTA | dark ink / black, not glowing brand purple |
| lesson max width | 760–780 px |
| normal lesson side rails | closed by default |
| Path rail when opened | 248 px |
| Inspect rail when opened | 304 px |
| History | closed by default; explicit reveal |

### Typography hierarchy

Learner-facing generated text is **instructional text, not marketing hero copy**.

| Object | Desktop size | Constraint |
| --- | ---: | --- |
| project / lesson identity | 18–22 px | usually 1–2 lines |
| current next move | 23–30 px | target <= 4 lines |
| learner action | 12–15 px | readable, direct |
| body explanation | 12–15 px | max ~65ch where prose is necessary |
| rail heading | 11–14 px | secondary |
| metadata | 8–10 px | never the main hierarchy |

A long `frontier` string must not become a 50–80 px headline. It is a model/state description,
not the lesson title.

### Shape system

- primary learning blocks: 18 px radius;
- compact panels / prompts: 12–14 px radius;
- small control buttons: 7–10 px radius;
- segmented navigation may use full-pill;
- do not invent additional radii.

### Color semantics

Large surfaces stay neutral.

- violet/cobalt: current concept / path relation;
- amber: learner prediction / attempt;
- blue: feedback / evidence context;
- green: accepted stable state / continuation;
- coral: warning / correction.

Color cannot independently communicate learner truth.

## Deterministic lesson composition

Normal Learn / Practice view:

```text
64px app bar
────────────────────────────────────────────
                lesson identity
                current frontier (small)
                contextual mode note

        ┌──────────────────────────────┐
        │ ONE CURRENT COGNITIVE MOVE   │
        │ learner action               │
        └──────────────────────────────┘

        ┌──────────────────────────────┐
        │ representation / interactive │
        └──────────────────────────────┘

        ┌──────────────────────────────┐
        │ learner response             │
        │                    [Send]    │
        └──────────────────────────────┘

        feedback after assessment
────────────────────────────────────────────
Path / Inspect / History are explicit reveals
```

The learner must be able to answer within a few seconds:

1. What am I working on?
2. What do I do now?
3. Where can I get more context if I need it?

## Workspace disclosure model

### Default

- central lesson only;
- Path closed;
- Inspect closed;
- History closed.

### Path

Contains:

- Mission;
- Completion Gate;
- compact LearningMap;
- full Map entry.

### Inspect

Contains:

- Frontier state;
- Decision trace;
- Evidence ladder;
- pending / accepted state proposals;
- Learning Library;
- misconceptions;
- review candidates.

### Full Map

Dedicated map mode retains full graph inspection, revision history, proposal review, and semantic
edge information.

## Rejection rules

Reject a learner-facing UI change when any of these are true:

- Runtime/authority vocabulary dominates the first viewport;
- a long generated string becomes a hero headline;
- the normal learning view opens with three permanent rails;
- two or more panels compete with the current learner action;
- an explanation is rendered as a prose wall where a visual / interactive object can do the job;
- progress color implies mastery without accepted Evidence;
- a passing build is used as evidence that the rendered UI is acceptable;
- the interface visually clones Brilliant instead of translating its learning hierarchy.

## QA viewports

Required:

- 1440 × 900;
- 1280 × 800;
- 390 × 844.

For each viewport capture:

- default Learn view;
- Path open;
- Inspect open;
- long Chinese frontier / next move;
- provider pending / failure;
- assessed feedback;
- empty map;
- read-only project.

