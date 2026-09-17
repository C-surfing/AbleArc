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

Edges encode meaningful prerequisites or conceptual dependence. The focused
Map surface lets a learner select a node and inspect its incoming dependencies,
downstream unlocks, mission relevance, frontier status, accepted learner
overlay, and node-level topology revision history. Evidence-grounded topology
proposals are reviewed explicitly in Map mode before learner acceptance may
produce a new canonical revision. Selection and navigation remain read-only.

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

It is not a message-by-message chat history. The timeline may expand a validated
**learner-state replay** derived from accepted `state-decision` receipts. Replay
shows concept-level `before → after` changes, acceptance rationale, Evidence
count, authority, and linked Turn context when available. Rejected proposals
remain audit records but are not presented as learner-model changes. See
[`LEARNER-STATE-REPLAY.md`](LEARNER-STATE-REPLAY.md).

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

The implementation resolves the active Project and reads its local files and
structured runtime:

```text
.learning/LEARNER.md
.learning/projects/<project-id>/missions/<mission-id>/MISSION.md
.learning/projects/<project-id>/map/current.json
.learning/projects/<project-id>/map/ROADMAP.md
.learning/projects/<project-id>/STATE.md
.learning/projects/<project-id>/runtime/state.json
.learning/projects/<project-id>/runtime/receipts/
.dogfooding/<arc>/sessions/
```

The canonical map contains topology only. The Workspace validates it, joins
accepted Runtime mastery by node ID, asks ELK for a deterministic layered
layout, and renders the result with React Flow. A missing canonical map may use
the legacy Markdown projection; an invalid canonical map fails closed.

The web app is local-first: learner state is stored in the repository workspace
and Git-ignored. When a remote Provider is explicitly configured, the minimized
pending-turn context is sent to that endpoint for assessment under the boundary
documented in `evaluation/PRIVACY.md` and `docs/AGENT-ADAPTER.md`.

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

The UI is **action-first and authority-conservative**. It may display accepted runtime state, decision/evidence provenance, local Markdown state, arc metadata, and a replay projection of accepted state transitions. It captures the learner's response as an observation and renders agent-authored feedback once evidence is recorded. It must not grade that response in React, promote mastery, rewrite learner-model conclusions, or infer history from UI interaction.

The runtime write bridge distinguishes:

- explicit learner edits;
- agent-proposed state updates;
- evidence-backed accepted updates;
- evaluation records.

Pending evidence-grounded state proposals may now be reviewed in the Workspace. The learner supplies an explicit rationale and chooses accept or reject. The client never applies the transition itself: the server delegates to the Runtime, which re-checks lifecycle state, stale projections, and transition policy before writing an immutable `state-decision` receipt. Policy issues require a separate explicit learner override acknowledgement. See [`STATE-PROPOSAL-REVIEW.md`](STATE-PROPOSAL-REVIEW.md).

Learner-state replay is separately read-only. It reconstructs accepted transitions from immutable proposals/decisions, checks their continuity against `runtime.rebuild_state()`, and optionally joins Turn summaries. It creates no receipts and does not define review priority.

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
- ELK for deterministic, disposable graph layout;
- local filesystem adapter for `.learning/` / `.dogfooding/`;
- server-only OpenAI-compatible AgentAdapter for strict assessment and next-move proposals;
- no database in the first cut.

The first app provides:

- polished three-column shell;
- Teach / Study / Map / Review mode navigation;
- local roadmap visualization plus focused full-screen Map inspection;
- selected-node dependency, downstream-unlock, frontier, mission-relevance, accepted-overlay, and topology-history inspection;
- learner-facing review of immutable evidence-grounded LearningMap proposals with stale-revision protection;
- learner frontier/evidence/misconception panel;
- representation-switching learning canvas;
- session timeline plus on-demand accepted learner-state diff/replay;
- Project creation, switching, pause/resume, retained Archive, and maintenance entry;
- a Runtime-backed Mission Gate card that distinguishes collecting Evidence,
  ready, verified completion, and unverified administrative Archive;
- learner-facing review of pending evidence-grounded state proposals with explicit accept/reject rationale and guarded policy override;
- lifecycle-aware read-only interaction states;
- a short session brief instead of a repeated product introduction;
- optional Provider-backed response assessment with retryable local pending state;
- graceful demo snapshot when no local learner state exists;
- responsive layout;
- build validation in CI;
- canonical typed LearningMap topology with explicit semantic edges;
- append-only map revision history and generated Markdown projection;
- Runtime mastery overlay kept separate from map authority.

It does **not** yet provide:

- additional Provider adapters, streaming, or Provider tool calls;
- client authority to interpret evidence or promote mastery;
- automated visualizer subagent;
- automated Review queue or scheduler;
- richer whole-map structural comparison/animation beyond node history;
- large-graph navigation/filtering justified by real Project scale;
- direct graph editing or automatic topology-proposal acceptance;
- Obsidian sync;
- multiplayer/mentor mode;
- cloud learner-data storage.

## Next implementation slice

The previously planned learner-facing state-proposal review, LearningMap
proposal review, node-level topology history, and learner-state session replay
are now implemented. Do not broaden them into arbitrary self-declared mastery,
direct graph mutation, or transcript replay.

The next product work should be earned through real Projects:

1. validate the Provider-backed turn loop and `frequency_tree_v1` artifact in a real Bayes learning arc;
2. use learner-state replay across multiple sessions to observe which state/evidence patterns actually predict useful retrieval needs;
3. add a Review queue only after that longitudinal evidence defines useful trigger semantics;
4. add another renderer only when a repeated target relation requires it;
5. add richer whole-map comparison or large-graph navigation only when real map scale creates a demonstrated inspection problem.

## Product acceptance criteria

The workspace is succeeding when a learner can open it and, without reading documentation, answer:

- what am I learning right now?
- what prerequisite or misconception is blocking me?
- what action am I expected to perform next?
- what evidence supports my current state?
- what changed across recent sessions?

If the learner mainly sees metrics, cards, badges, or a graph they must manage, the product has drifted from ai4learning's purpose.
