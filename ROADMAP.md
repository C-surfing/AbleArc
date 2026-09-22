# AbleArc roadmap

Status: **Skill-first dogfood active**  
Decision date: **2026-09-22**

## Canonical direction

AbleArc is now a **lightweight adaptive learning Skill**, not a first-party Learning OS, Web product, or MCP-centered application.

The canonical entry point is skills/ablearc/SKILL.md.

The objective remains capability_after - capability_before, but the implementation strategy changes from protocol-heavy runtime orchestration to **LLM-first teaching judgment with optional lightweight persistence and companion-skill composition**.

## Current architecture

    Learner
      │
      ▼
    AbleArc Skill
      │
      ├─ Goal
      ├─ Learner Model
      ├─ Frontier
      └─ Next Move
           │
           ├─ explain / ask / practice / review
           ├─ Archify when a visual model helps
           ├─ University Skill when substantial material helps
           ├─ research when facts/sources need verification
           └─ execution when running something has learning value

Generated artifacts support the learning move. They do not prove learning happened.

## Phase S1 — canonical Skill reset

**Complete.**

- establish skills/ablearc as the canonical entry;
- collapse the visible architecture to Goal / Model / Frontier / Move;
- preserve the strongest teaching policy from the previous Teach/Study skills;
- remove runtime receipts, MCP calls, provider setup, Web assumptions, and artifact protocols from the default learning path;
- add companion-skill routing for Archify and University Skill;
- add behavior-level acceptance scenarios.

Exit criterion: AbleArc can be installed as a single Skill directory and used naturally without first-party infrastructure.

## Phase S2 — repository de-bloat

**Complete.**

The retired Web Workspace, MCP/plugin host, legacy Teach/Study entries, deterministic Runtime/schema/tool stack, root state templates, and product-only docs/tests are no longer part of the current tree.

Useful pedagogy was migrated into `skills/ablearc/references/`. Optional persistence is represented by one small Skill-local template instead of a custom runtime.

Git history is the archive for retired implementations.

## Phase S3 — learning effectiveness dogfood

**Active.**

Test the Skill across real topics and sessions:

- programming / software engineering;
- mathematics;
- ML/AI;
- paper learning;
- review after delay;
- learner-provided materials;
- visual explanation;
- deep generated material;
- YouTube/Bilibili source-first lecture rendering and follow-up learning.

Evaluate behavior, not UI engagement:

- Did it locate the actual confusion?
- Did it choose one high-value next move?
- Did it over-assess?
- Did it over-explain?
- Did it use a companion skill only when useful?
- Could the learner later explain, apply, or transfer the idea?
- Did the interaction remain natural?

Do not fabricate mastery evidence for evaluation.

## Phase S4 — portable packaging

Only after the Skill itself is good:

- make installation straightforward across common Agent Skill hosts;
- document optional companion installations;
- add minimal compatibility metadata where useful;
- keep third-party skills optional rather than vendored into AbleArc;
- document source-first video companions separately from topic-first University Skill generation.

## Explicitly deferred / removed

The following are no longer goals unless future real use demonstrates a concrete learning need:

- first-party Web UI;
- custom learning dashboard;
- graphical provider setup;
- timer/Pomodoro product UX;
- notifications;
- cloud learner database;
- generic transcript memory;
- broad RAG/vector infrastructure;
- gamification;
- a dedicated material-generation provider subsystem;
- deterministic transaction receipts for ordinary learning turns.

## Anti-bloat rule

Before adding a subsystem:

1. identify a repeated learner-visible failure;
2. show why the current Skill policy and available tools cannot handle it;
3. prefer clearer instructions or a companion skill over new infrastructure;
4. add code only when execution or deterministic validation is actually necessary;
5. keep the default learning path usable without that subsystem.

The smallest coherent learning system wins.
