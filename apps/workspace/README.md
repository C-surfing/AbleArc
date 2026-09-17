# AbleArc Workspace

This is the first-party learner-facing product surface for **AbleArc**. It is intentionally local-first and sits over the existing evidence-driven Learning Runtime rather than replacing its authority.

## Run

From `apps/workspace/`:

```bash
npm install
npm run dev
```

Open the local Next.js URL printed by the dev server.

For the first real learner-facing vNext trial, use [`../../evaluation/FIRST-PILOT.md`](../../evaluation/FIRST-PILOT.md). It connects Web startup, Project/arc creation, Today + DailyContext, Focus Session, one assessed Runtime turn, and the private product-dogfood checkpoint workflow without fabricating evidence.

To let the official Workspace assess a saved response and generate the next
move, copy `.env.example` to `.env.local`, set the server-only API key and
model, then restart the dev server. The configured endpoint must support the
OpenAI-compatible Chat Completions strict JSON Schema contract. See
[`../../docs/AGENT-ADAPTER.md`](../../docs/AGENT-ADAPTER.md).

If the repository contains `.learning/`, the workspace resolves either the
legacy root layout or the active v0.2 Project, then reads that context's current
mission, roadmap, frontier, evidence, misconceptions, and review candidates. A
v0.2 `workspace.json` is the atomic switch; retained legacy files are recovery
data and are not read a second time. The Workspace also reads only arc/session
metadata from `.dogfooding/` for the session rail.

If no local learner state exists, the product should lead with Entry: what the
learner wants to learn or become able to do. Project creation then persists the
explicit capability goal and opens a conservative representative-attempt probe.
The map stays honestly empty until a Teach agent interprets the response and
creates domain-specific concepts. Demo data is preview-only and never learner
evidence.

## Current scope

Implemented:

- three-column desktop workspace;
- responsive tablet/mobile collapse;
- local Project creation, switching, pause/resume, Archive, and maintenance entry;
- Runtime-backed Mission Completion status, criterion Evidence inspection, and verified Complete + Archive action;
- lifecycle-aware read-only composer behavior;
- concise session brief derived from the selected Project and due reviews;
- Teach / Study / Map / Review mode navigation;
- canonical typed LearningMap with explicit semantic edges;
- deterministic ELK layout rendered through React Flow;
- accepted Runtime mastery joined as a separate display overlay;
- legacy Markdown map fallback when no canonical map exists;
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
- first OpenAI-compatible `AgentAdapter` with server-only configuration;
- strict structured assessment + next-move generation after response capture;
- Runtime-mediated validated advance, stale-turn protection, and retryable Provider failures;
- typed `frequency_tree_v1` LearningArtifact renderer with an adjustable base rate;
- prediction-before-reveal and validated interaction context on the learner Observation;
- zero-state workspace-v0.2 Project onboarding from one observable capability goal;
- learner-owned Mission persistence without inferred mastery or a fabricated map;
- immediate baseline action using the existing Decision/response path;
- demo fallback for design review.

The vNext product migration follows [`../../docs/VNEXT-ROADMAP.md`](../../docs/VNEXT-ROADMAP.md). The near-term sequence is Entry → Today → DailyContext → Focus Session while the current Workspace remains accessible during migration.

Not implemented yet:

- additional Provider adapters, streaming, or Provider tool calls;
- general client-side authoritative learner-state writes;
- source drawer content;
- full-screen interactive Map editor;
- additional artifact renderers beyond the validated frequency-tree slice;
- scheduler or cloud persistence.

The composer records one response to the current structured learning decision.
When a Provider is configured, the server asks the adapter for a strict
assessment and one next move, then commits both through `runtime.py advance`.
Without a Provider, any Teach/Study agent can still consume the response
through `runtime.py pending` and advance it explicitly. The Workspace renders
feedback and enables the new decision without exposing receipt mechanics or
silently changing mastery.

The Project menu never deletes learning state. Starting archived maintenance
temporarily reopens scoped Runtime writes; the connected Agent finishes that
review only after interpreting recorded evidence. The Workspace does not let a
learner self-declare retention.

The Mission Gate card calls the headless `completion-status` command rather
than reinterpreting learner evidence in React. A ready card can request
`complete-project`, but the Python Runtime re-checks the selected Project,
pending response, criteria thresholds, and distinct Feynman/performance
Evidence before writing the immutable completion record. Manual Archive stays
available as an administrative transition and is explicitly labeled as
unverified.

## Architecture boundary

```text
AbleArc Learning OS
      ↓
first-party Web / API experience
      ↓
server-only AgentAdapter (optional)
      ↓
strict assessment + next-move proposal
      ↓
authority-aware Learning Runtime
      ↓
.learning/runtime receipts + projections
```

The current artifact slice is intentionally narrow. The next renderer must be earned by a real learning arc whose target relation cannot be expressed by the frequency tree. Additional Provider transports remain adapters over the same local boundary.

See [`../../docs/VISUAL-WORKSPACE.md`](../../docs/VISUAL-WORKSPACE.md) for the
workspace specification and [`../../docs/LEARNING-MAP.md`](../../docs/LEARNING-MAP.md)
for the topology, revision, and authority contract.
