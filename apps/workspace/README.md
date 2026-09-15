# Visual Learning Workspace

This is the first product surface for ai4learning. It is intentionally a **read-first, local-first workspace** over the existing teaching runtime.

## Run

From `apps/workspace/`:

```bash
npm install
npm run dev
```

Open the local Next.js URL printed by the dev server.

If the repository contains `.learning/`, the workspace reads the current mission, roadmap, frontier, evidence, misconceptions, and review candidates. It also reads only arc/session metadata from `.dogfooding/` for the session rail.

If no local learner state exists, the UI shows a clearly labeled Bayes demo snapshot so the product shell can be reviewed without fabricating learner evidence.

## Current scope

Implemented:

- three-column desktop workspace;
- responsive tablet/mobile collapse;
- Teach / Study / Map / Review mode navigation;
- React Flow learning map;
- current learner frontier and state;
- evidence ladder;
- active misconception and review cards;
- representation switcher;
- longitudinal session timeline;
- local `.learning/` filesystem adapter;
- structured runtime state/evidence projection with Markdown fallback;
- latest decision and authority trace;
- active **Your move** response composer backed by the local runtime;
- local acknowledgment without premature grading or mastery promotion;
- learner-visible feedback joined to the previous response;
- automatic composer reset when an evidence-grounded next decision arrives;
- agent inbox/advance CLI bridge without provider coupling;
- demo fallback for design review.

Not implemented yet:

- model/provider connection;
- hosted model/provider transport;
- client-side authoritative writes to `.learning/` (writes remain in the local runtime CLI/agent bridge);
- source drawer content;
- full-screen interactive Map editor;
- structured math/diagram renderer payloads;
- scheduler or cloud persistence.

The composer records one response to the current structured learning decision. The Teach/Study agent can consume it through `runtime.py pending`, then commit feedback plus the next move through `runtime.py advance`. The Workspace renders the feedback and enables the new decision without exposing receipt mechanics or silently changing mastery.

## Architecture boundary

```text
Teach / Study runtime
      ↓
structured decision / evidence / state receipts
      ↓
.learning/runtime + Markdown projections
      ↓
workspace filesystem adapter
      ↓
Visual Learning Workspace
```

The next slice should render one typed LearningArtifact selected by the Teach/Study agent. Hosted model transport can remain an adapter over the same local boundary.

See [`../../docs/VISUAL-WORKSPACE.md`](../../docs/VISUAL-WORKSPACE.md) for the product specification.
