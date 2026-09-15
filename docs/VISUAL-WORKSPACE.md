# Visual Learning Workspace

The Visual Learning Workspace is the product surface for ai4learning. It must make the learner's current structure, frontier, evidence, and next useful action visible without turning learning into a dashboard-management task.

## Product thesis

The workspace should answer four questions at a glance:

1. **Where am I?** — the local knowledge/dependency map and current frontier.
2. **Why am I stuck?** — the active learner-model hypothesis or misconception that matters now.
3. **What should I do next?** — one high-value cognitive move, not a queue of generic content.
4. **What can I do now that I could not do before?** — capability evidence across retrieval, explanation, application, and transfer.

The workspace is a view over the existing teaching runtime. It is not a second source of truth and must not silently promote learner state.

## Information architecture

Desktop MVP uses a three-column learning workspace with a lightweight session rail:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ai4learning       Teach   Study   Map   Review                 local-first │
├──────────────────┬─────────────────────────────────┬───────────────────────┤
│ Learning Map     │ Learning Canvas                 │ Learner State         │
│ + Arc Navigator  │                                 │ + Evidence            │
│                  │ conversation / challenge        │                       │
│ dependency map   │ formula / derivation / diagram  │ current frontier      │
│ current frontier │ worked example / learner action │ active misconception  │
│ arc context      │ representation switcher         │ evidence ladder       │
│                  │ source drawer trigger           │ next move / review    │
├──────────────────┴─────────────────────────────────┴───────────────────────┤
│ Session Timeline — meaningful state transitions, not transcript history    │
└────────────────────────────────────────────────────────────────────────────┘
```

Mobile/tablet collapse order:

```text
Canvas → current frontier/evidence → local map → timeline
```

The canvas remains primary. State chrome must never crowd out the learning move.

## Four modes

### Teach

Purpose: grow a mental model.

Primary surface:

- current local map;
- one explanation / guided discovery / worked example / representation;
- one learner action;
- verification;
- state change only when evidence justifies it.

### Study

Purpose: strengthen and test an existing model.

Default sequence:

```text
retrieve → diagnose → targeted repair → apply → transfer
```

Do not begin by replaying the lesson.

### Map

Purpose: inspect the dependency hypothesis and learner overlay.

The map is not a progress-percentage dashboard. Nodes encode:

```text
○ unknown
◔ exposed
◐ developing
● stable
◆ transferable
```

Edges encode meaningful prerequisites or conceptual dependence. The selected node should expose why the edge matters, evidence supporting its state, and what it unlocks.

### Review

Purpose: inspect what deserves retrieval or transfer next.

Review prioritization is driven by learner state and dependency relevance, not streaks or gamification.

## Core components

### Node Card

Displays:

- concept/capability;
- current learner state;
- dependency relation;
- concise evidence indicator;
- whether it is the current frontier.

The first workspace uses React Flow for the map surface but keeps nodes deliberately compact. Dragging is not learning; graph editing is secondary.

### Representation Switcher

A representation is a cognitive instrument. The switcher lets one learning object move between useful views when the teaching runtime has supplied them, for example:

```text
frequency tree ↔ table ↔ conditional notation
code ↔ dataflow
verbal causal model ↔ state diagram
geometric object ↔ symbolic derivation
```

A representation must preserve the contract defined in `docs/VISUAL-TEACHING.md`. Switching view is useful only if the learner reads, predicts, reconstructs, or translates something from it.

### Evidence Ladder

Shows the strongest supported capability level without pretending that learning is a scalar score:

```text
recognition → recall → explanation → application → transfer
```

The visual should distinguish observed evidence from unverified future levels.

### Misconception Card

Shows only active hypotheses that affect the next teaching decision:

- generative belief/model;
- confidence;
- decisive evidence;
- repair/testing state;
- evidence needed to resolve it.

Do not expose a psychological dossier or every speculative learner-model field.

### Arc Card

Shows one longitudinal learning arc:

- mission/capability target;
- current session;
- retrieval/revisit status;
- representation/context perturbation;
- transfer status;
- unresolved uncertainty.

### Source Drawer

Keeps source provenance accessible without replacing the teaching surface with research logistics.

Sources should open beside the current reasoning step, not navigate the learner away from it.

### Session Timeline

Shows meaningful learning transitions such as:

```text
frontier established
misconception falsified
representation switched
retrieval succeeded / failed
roadmap detour
transfer attempted
```

It is not a message-by-message chat history.

## Visual language

The design direction combines:

- Notion-like calm information density;
- Linear-like precision, hierarchy, keyboard-friendly interaction, and restrained chrome;
- 3Blue1Brown-like respect for motivated representations and structural visual meaning;
- `textbook-anything`'s reading-oriented typography, limited accent palette, logical derivation spacing, and practice/figure placement near the argument that uses them.

Do not copy another product's branding or component styling.

### Typography

- Sans serif UI and headings.
- Reading-oriented body measure; avoid dense full-width paragraphs.
- Mathematical content receives explicit vertical space rather than reduced font size.
- Monospace is reserved for code, symbolic labels, and small state identifiers.

### Surface hierarchy

Use three levels only:

1. canvas/background;
2. structural panel;
3. focused card / active learning object.

Avoid boxing every paragraph. Use spacing, alignment, and rules before adding containers.

### Color

Color reinforces state but never carries it alone. Every state also has a glyph/label.

The initial palette is warm-neutral with one cool interaction accent and restrained state colors. No gamified rainbow progress meters.

## Data boundary

The implementation reads from the existing local files and, when present, the structured runtime:

```text
.learning/MISSION.md
.learning/LEARNER.md
.learning/ROADMAP.md
.learning/STATE.md
.learning/runtime/state.json
.learning/runtime/receipts/
.dogfooding/<arc>/sessions/
```

The web app is local-first. Raw learner evidence remains local under the privacy contract in `evaluation/PRIVACY.md`.

### Source of truth

```text
Teach / Study protocol
        ↓
decision / observation / evidence receipts
        ↓
explicit state authority
        ↓
.learning/runtime + Markdown projections
        ↓
Visual Learning Workspace
```

The UI is **action-first and authority-conservative**. It may display accepted runtime state, decision/evidence provenance, local Markdown state, and arc metadata. It may capture the learner's response as an observation, but it must not automatically grade that response, promote mastery, or rewrite learner-model conclusions.

The runtime write bridge distinguishes:

- explicit learner edits;
- agent-proposed state updates;
- evidence-backed accepted updates;
- evaluation records.

## MVP implementation

Location:

```text
apps/workspace/
```

Stack:

- Next.js 16.3 Active LTS;
- React 19.2;
- TypeScript;
- Tailwind CSS 4;
- React Flow for the dependency-map surface;
- local filesystem adapter for `.learning/` / `.dogfooding/`;
- no database in the first cut.

The first app provides:

- polished three-column shell;
- Teach / Study / Map / Review mode navigation;
- local roadmap visualization;
- learner frontier/evidence/misconception panel;
- representation-switching learning canvas;
- session timeline;
- graceful demo snapshot when no local learner state exists;
- responsive layout;
- build validation in CI.

It does **not** yet provide:

- a model/provider bridge;
- authoritative state mutation;
- automated visualizer subagent;
- scheduler;
- Obsidian sync;
- multiplayer/mentor mode;
- cloud learner-data storage.

## Next implementation slice

After the shell is validated visually and through actual use:

1. connect the existing authority-aware receipt runtime to an agent/model transport;
2. render structured representation payloads (math, diagram, table, code/dataflow) rather than demo blocks;
3. add a learner-facing proposal review interaction for explicit edits and policy overrides;
4. add full-screen Map mode with node inspection and roadmap revision proposals;
5. add session diff/replay around learner-model changes, not raw chat;
6. add Review queue only after longitudinal evidence defines useful trigger semantics.

## Product acceptance criteria

The workspace is succeeding when a learner can open it and, without reading documentation, answer:

- what am I learning right now?
- what prerequisite or misconception is blocking me?
- what action am I expected to perform next?
- what evidence supports my current state?
- what changed across recent sessions?

If the learner mainly sees metrics, cards, badges, or a graph they must manage, the product has drifted from ai4learning's purpose.
