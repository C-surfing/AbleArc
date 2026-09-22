# AbleArc Visual Direction v0.3 — Sculpted Learning

Status: **canonical redesign direction**

Issue: #163

## Design read

AbleArc is a **premium interactive learning product for highly active technical learners**.

The product behavior reference is Brilliant: visual, interactive, problem-first learning that makes the learner act instead of consume a wall of explanation.

The visual/art-direction reference is Taste Skill + Floria: strong composition, asymmetry, confident display typography, negative space, physical depth, and motion that gives the interface a sense of authorship.

AbleArc must not visually clone either reference.

## User-confirmed taste dials

```text
DESIGN_VARIANCE   8 / 10
MOTION_INTENSITY  7 / 10

VISUAL_DENSITY
  Entry / Landing  3
  Today            4
  Focus            3
  Workspace        7
```

Dark mode is deferred.

## Product feeling

The first emotional response should be:

> I want to start learning.

The product should feel more like an intelligently directed learning environment than a productivity dashboard.

## Core composition

### Stable center, expressive perimeter

The cognitive task stays spatially stable.

Art direction may change around it:

- asymmetric whitespace;
- project visual worlds;
- oversized display type on Entry only;
- off-grid labels / progress markers;
- photographic or generated visual fields;
- abstract STEM geometry;
- layered motion tied to state changes.

Do not move the answer box, current question, or primary action merely for visual novelty.

## Signature: Sculpted Learning

AbleArc should have a recognizable visual signature based on three ideas:

1. **Arc** — learning is a directed path, not a feed.
2. **Object** — concepts, examples, attempts, diagrams, and feedback are physical learning objects.
3. **Field** — each Project creates its own visual world around the stable learning surface.

This replaces the old “warm AI workspace” identity.

## Surface hierarchy

### Entry

Entry is the only learner surface allowed to behave like a high-end brand page.

- display typography may be very large;
- composition should be asymmetric;
- strong negative space;
- a large visual field / abstract project arc may occupy 35–50% of the viewport;
- the question input is a primary object, not a generic textarea card;
- no dashboard chrome;
- no feature-card grid.

### Today

Primary job: **resume the current Project**.

First viewport:

```text
project identity / visual world
      ↓
current frontier in one short line
      ↓
one dominant Resume learning action
      ↓
session context as optional disclosure
      ↓
small path / review preview
```

No duplicated Mission + Frontier + Recommendation + Map cards.

### Focus

Focus is nearly full-screen.

Default chrome:

- back;
- small Project identity;
- contextual support control;
- optional timer;
- exit/close when relevant.

Hide ordinary product navigation.

The first viewport should contain:

- one dominant cognitive move;
- one visual / interactive Learning Object when appropriate;
- supporting material;
- learner response affordance;
- a subtle next-step hint.

The interface should not look like chat.

### Workspace / Inspect

Workspace is advanced mode and may be dense.

Density is allowed because the user explicitly entered an inspection surface.

It may expose:

- Learning Map;
- Evidence;
- Decision trace;
- State proposals;
- Learning Library;
- Session history.

It should still share typography, color, shape, and motion with the learner surfaces.

## Typography

### Display

Use an expressive modern grotesk, not a serif-first editorial cliché.

Preferred family character:

- Bricolage Grotesque;
- Cabinet Grotesk;
- Satoshi Display;
- PP Neue Montreal / equivalent;
- wide or variable grotesk alternatives.

Display typography appears primarily on Entry and visual Project identity.

### UI / reading

Use a disciplined grotesk:

- Instrument Sans-like;
- Geist-like;
- Satoshi-like;
- system fallback only when required.

Rules:

- learner explanation body: approximately 15–18 px;
- active cognitive move: approximately 30–46 px desktop depending on length;
- Today Project title: 36–56 px;
- Entry display: 64–108 px desktop;
- long generated text never becomes display typography.

## Palette v0.3

The previous purple / warm-paper palette is retired as the brand default.

Base family: **mineral neutral + graphite + verdant**.

```text
canvas          #F2F4F1
surface         #FCFDFB
surface-strong  #FFFFFF
ink             #111512
ink-soft        #303A34
muted           #69736D
faint           #969F99
line            #D9DED9

brand           #276A50
brand-strong    #164735
brand-soft      #DDEDE5
```

The brand has one principal accent: verdant green.

Strong learner-state semantics remain allowed, but state colors are not brand accents and color never carries truth alone.

Suggested semantic family:

```text
prediction / think  amber
attempt             coral
evidence            cobalt
developing          blue
stable              verdant
transfer            plum
warning             vermilion
```

Large surfaces stay neutral.

## Visual material

Project worlds may use:

- generated or authored high-end imagery;
- subject-specific macro photography;
- abstract STEM geometry;
- topology / field / orbital motifs;
- diagrams;
- code texture;
- sparse procedural graphics.

Avoid:

- stock “student studying” photography;
- random AI blobs;
- purple mesh gradients;
- decorative 3D objects unrelated to the subject.

Project visual identity is not Evidence and does not imply mastery.

## Learning objects

Target visual/prose ratio is roughly **70 / 30**, adapting by subject.

Prefer a visual or manipulable representation when it materially improves understanding.

Object families:

- prompt;
- diagram;
- interactive;
- worked example;
- source/material;
- attempt;
- feedback;
- evidence update;
- next hint.

Do not render every object as the same rounded white card.

Use containment only when it communicates interaction or hierarchy.

## Tutor / scaffolding

Tutor support should feel contextual, not like a second chat app.

Preferred behavior:

- object-level annotation;
- highlight / point;
- intermediate question;
- progressive scaffold;
- optional support rail / overlay.

A scaffold should change how the learner sees the current object, not introduce a parallel conversation timeline.

## Learning Map

The default learner-facing map should use an **Archify-style visual representation**:

- direct spatial structure;
- explicit current frontier;
- prerequisite and next-direction relations;
- limited visible depth;
- clear visual hierarchy;
- labels attached to meaningful nodes/relations.

The full graph remains an Advanced / Workspace surface.

## Motion

Motion intensity: 7.

Motion must serve one of:

1. causality;
2. state change;
3. spatial continuity;
4. progress;
5. tactile interaction feedback.

Allowed:

- staggered object entrance;
- spring-like panel reveal;
- diagram state interpolation;
- subtle parallax in Entry visual fields;
- route/path drawing;
- crossfade/slide between learning moves;
- pointer-responsive learning objects when useful.

Avoid:

- perpetual floating;
- decorative shimmer;
- scroll hijacking in Focus;
- motion that delays reading;
- animation on every icon/button.

Respect `prefers-reduced-motion`.

## Shape system

Use a documented mixed system:

- major interactive learning objects: 20–24 px;
- secondary surfaces: 14–16 px;
- form controls: 10–12 px;
- compact icon controls: 8–10 px;
- pills only for true segmented/status controls.

Avoid making every container a rounded card.

## Navigation

### Entry

Contained, floating/quiet header. No full-width bordered sticky SaaS navbar.

### Today

Minimal product navigation. Project switching remains available but visually secondary.

### Focus

Near full-screen. Hide ordinary navigation.

### Workspace

Navigation can be explicit because this is an inspection surface.

## Required states

Every redesigned learner surface must cover:

- loading;
- empty;
- error;
- read-only;
- Provider pending;
- Provider failure;
- assessed feedback;
- long Chinese text;
- mobile.

## Rejection rules

Reject a design if any are true:

- looks like ChatGPT;
- looks like an enterprise dashboard in the default learner path;
- purple/blue AI glow is the brand identity;
- looks like Notion plus cards;
- looks like a children’s education app;
- AI prose dominates a viewport;
- three equal cards are used as the default organizing pattern;
- decorative motion weakens learning speed;
- Runtime vocabulary dominates learner-facing hierarchy;
- high-end aesthetics reduce accessibility or cognition;
- every section uses the same centered max-width composition;
- every object uses border + white background + shadow.

## Implementation order

1. Brand/token reset.
2. Entry redesign.
3. Today / Resume redesign.
4. Focus immersive shell.
5. Learning Object visual families.
6. Tutor/object-level support.
7. Archify-style learner Map.
8. Advanced Workspace visual convergence.
9. Loading/empty/error/read-only polish.
10. Rendered QA + Vercel preview.

## QA

Required screenshots:

- 1440×900;
- 1280×800;
- 390×844.

Required surfaces:

- Entry;
- Today;
- Focus;
- Focus Chinese;
- Focus support open;
- assessed feedback;
- Provider pending/failure;
- Workspace;
- Map;
- read-only;
- empty state.

The redesign is accepted only when these screenshots look like one authored product, not a collection of individually styled components.
