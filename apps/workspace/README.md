# Visual Learning Workspace

This is the first product surface for ai4learning. It is intentionally a **read-first, local-first workspace** over the existing teaching runtime.

## Run

From `apps/workspace/`:

```bash
npm install
npm run dev
```

Open the local Next.js URL printed by the dev server.

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

If no local learner state exists, the UI first asks what the learner wants to
become able to do. It creates workspace-v0.2 and the first Project directly,
saves that explicit goal, and immediately opens a conservative
representative-attempt probe. The map stays honestly empty until a Teach agent
interprets the response and creates domain-specific concepts. A clearly
labeled Bayes preview remains available before Project creation without being
presented as learner evidence.

## Current scope

Implemented:

- three-column desktop workspace;
- responsive tablet/mobile collapse;
- local Project creation, switching, pause/resume, Archive, and maintenance entry;
- lifecycle-aware read-only composer behavior;
- concise session brief derived from the selected Project and due reviews;
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
- first OpenAI-compatible `AgentAdapter` with server-only configuration;
- strict structured assessment + next-move generation after response capture;
- Runtime-mediated validated advance, stale-turn protection, and retryable Provider failures;
- typed `frequency_tree_v1` LearningArtifact renderer with an adjustable base rate;
- prediction-before-reveal and validated interaction context on the learner Observation;
- zero-state workspace-v0.2 Project onboarding from one observable capability goal;
- learner-owned Mission persistence without inferred mastery or a fabricated map;
- immediate baseline action using the existing Decision/response path;
- demo fallback for design review.

Not implemented yet:

- additional Provider adapters, streaming, or Provider tool calls;
- general client-side authoritative learner-state writes (the Workspace exposes guarded Project lifecycle mutations, while evidence interpretation and mastery changes remain in the runtime/agent bridge);
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

## Architecture boundary

```text
Visual Learning Workspace
      ↓
server-only AgentAdapter (optional)
      ↓
strict assessment + next-move proposal
      ↓
authority-aware Runtime validation
      ↓
.learning/runtime receipts + projections
```

The current artifact slice is intentionally narrow. The next renderer must be earned by a real learning arc whose target relation cannot be expressed by the frequency tree. Additional Provider transports remain adapters over the same local boundary.

See [`../../docs/VISUAL-WORKSPACE.md`](../../docs/VISUAL-WORKSPACE.md) for the product specification.
