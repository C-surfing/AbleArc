# AbleArc Web — Brilliant-inspired learning hierarchy v0.2

Status: **experimental visual pass for Issue #152**

This direction keeps AbleArc's learning/runtime architecture but changes the learner-facing hierarchy. Brilliant is used as a reference for product discipline, not as a source of copied brand assets, illustrations, or proprietary UI.

## Reference principles

Brilliant's current product language consistently emphasizes:

- learn by doing;
- visual and interactive explanations;
- one concept at a time;
- immediate feedback;
- progressive challenge;
- a clear learning path;
- learner action before lengthy explanation.

AbleArc should adopt those presentation principles while preserving its own differentiators: open-ended domains, dynamic LearningMap, learner-owned reasoning, typed representations, Evidence, and conservative learner-state authority.

## What changes

### 1. The learning action is the page

The primary Workspace / Focus surface should read as a lesson/problem, not as a diagnostic dashboard.

Target hierarchy:

```text
context / progress
      ↓
one concise learning prompt
      ↓
visual or interactive representation
      ↓
learner action
      ↓
feedback
      ↓
next move
```

### 2. Typography is compact and instructional

Long learner-facing Chinese/English prompts are **not hero marketing headlines**.

- frontier / lesson title: about 25–34 px desktop;
- next move: about 22–28 px desktop;
- body: 12–15 px depending on interaction density;
- prefer short paragraphs, lists, diagrams, and interactive objects over large prose blocks.

### 3. Workspace rails are secondary

The left LearningMap and right learner-state diagnostics remain available, but they must not visually compete with the current learning move.

The rails answer:

- Where am I?
- What is known / uncertain?
- What evidence exists?

The center answers:

- What should I do now?

### 4. Clear physical learning objects

Question, learner attempt, representation, feedback, and evidence should have distinct shapes and surfaces.

The first visual pass uses:

- crisp white lesson surfaces;
- quiet neutral page background;
- restrained purple/blue/yellow/green semantic accents;
- medium-radius geometry;
- stronger borders, weaker shadows;
- black/dark primary actions.

### 5. Playful does not mean gamified

Do not import Brilliant's product-specific reward economy into AbleArc.

No default:

- XP;
- leagues;
- coins;
- streak pressure;
- confetti;
- fake mastery bars.

AbleArc progress comes from accepted learner evidence and map state.

## Implementation

The first pass lives in:

```
apps/workspace/app/brilliant-learning.css
```

It is loaded after `globals.css` so it can evolve as a visual layer without destabilizing Runtime behavior.

This is deliberately presentation-only. If the direction survives rendered QA and dogfooding, the next step should be structural:

1. make the Workspace learner-state rail collapsible;
2. turn LearningMap into a compact path/progress affordance by default;
3. move detailed Decision/Evidence inspection behind explicit inspection;
4. refactor long generated teaching prose into typed Learning Objects;
5. converge Workspace and Focus on the same lesson surface primitives.

## Acceptance signal

A learner should be able to open AbleArc at normal browser zoom and answer, within seconds:

> What am I learning right now, and what should I do next?

If the answer requires scanning Runtime terminology, three dense rails, or a wall of prose, the visual hierarchy has failed.
