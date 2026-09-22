> Superseded for learner-facing visual direction by [Taste Direction v0.3](TASTE-DIRECTION-V0.3.md). The earlier Playful Focus document remains useful as historical rationale, but new UI work should follow v0.3.

# AbleArc Playful Focus v0.1

Status: **canonical Web visual direction**

This document defines the learner-facing visual language for the first-party AbleArc Web Host. It changes presentation and interaction hierarchy only; Runtime authority, learner truth, Evidence, Map, Mission, Project lifecycle, and Completion semantics remain unchanged.

## Product character

**Focused · Curious · Playful · Editorial · Tactile**

Playful does not mean gamified or saturated. The learner's question and cognitive action should feel alive while the surrounding UI stays quiet.

Avoid:
- generic gray + one-purple AI SaaS styling;
- neon accents or dark-heavy surfaces;
- card grids where typography or whitespace can carry hierarchy;
- XP, coins, confetti, streak pressure, or decorative rewards;
- exposing receipt / decision machinery in the normal learner path.

## Color system

Use warm neutral surfaces for 80–90% of the screen and semantic color for 10–20% at most.

| Role | Token | Value | Meaning |
|---|---|---:|---|
| Canvas | `--paper` | `#F7F4EC` | warm learning space |
| Surface | `--surface-strong` | `#FFFEF9` | content surface |
| Ink | `--ink` | `#282532` | primary text / primary CTA |
| Concept | `--accent` | `#7463A8` | concept / current frontier |
| Think | `--think` | `#B88B3E` | pause, predict, inspect |
| Learner attempt | `--attempt` | `#C97868` | learner-owned reasoning |
| Evidence | `--evidence` | `#6E98B6` | assessed evidence / provenance |
| Stable | `--stable` | `#5F8E79` | accepted stable learner state |
| Growth | `--growth` | `#87995C` | continuation / reachable direction |

Rules:
1. Color never carries essential information alone.
2. Prefer tinted surfaces + dark text over bright colored text.
3. Focus surfaces should use less color than Entry / Today.
4. Do not introduce a new accent for each component.
5. Mastery color reflects accepted state only; it is not decorative.

## Typography

Display: **Bricolage Grotesque-like** character.
UI/body: **Instrument Sans-like** humanist grotesk.
Code: **IBM Plex Mono-like** technical mono.

The repo currently uses resilient system fallbacks so CI does not depend on remote font downloads. A later font-asset task may self-host the approved families.

Large questions are first-class layout objects:

> What actually happens  
> when a cache misses?

Prefer large, medium-weight editorial display text over bold SaaS headings.

## Core surfaces

### Entry

The zero-state entry should answer one question: **what is worth understanding?**

Keep:
- Model Settings;
- Workspace escape hatch;
- Project creation behavior;
- explicit capability goal semantics.

Remove from the visual foreground:
- architecture explanations;
- internal authority vocabulary;
- dashboard-style setup.

### Today

Today is not a dashboard. It should prioritize:
1. current learning arc;
2. the next useful move;
3. optional session-shaping context;
4. map/review context below the move.

All current Project, DailyContext, Review, Map, Paper, Reflection, Profile, Settings, and Workspace access remains available.

### Focus

Default state: **one primary learning column**.

Support (session shape, scaffold, authority explanation) is contextual and explicitly expandable. Timer remains optional UI state.

Focus must continue to preserve:
- lifecycle/read-only warnings;
- provider pending/failure/retry states;
- saved learner response behavior;
- current LearningCanvas;
- representation switching;
- Evidence/state review links;
- session close and Workspace escape hatches.

### Learning objects

Conversation is transport, not the only presentation primitive. Visually distinguish:
- Question / next move;
- Learner attempt;
- Representation;
- Feedback;
- Evidence;
- accepted learner-state change;
- source/material;
- reflection.

Learner text must remain visibly learner-owned. Never visually blur it into model-generated prose.

## Motion

Use subtle 150–350ms motion for:
- panel reveal;
- hover/focus;
- state-node transition;
- completion of a meaningful learning action.

Do not use celebration animation, confetti, coins, or motion that competes with reading.

Respect `prefers-reduced-motion`.

## Responsive rule

Desktop may reveal contextual secondary panels. Mobile returns to one reading column and moves secondary support below the primary action.

## Non-negotiable architecture boundary

A visual state is never learner truth.

React/CSS may display accepted Runtime state; it may not invent mastery, Evidence, Map revisions, Mission completion, or authority decisions.
