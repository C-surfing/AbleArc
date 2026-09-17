# Second Layer Roadmap

Second-layer infrastructure should normally be earned through real use rather than added speculatively. The Visual Learning Workspace is now an explicit product decision: it is promoted as a **thin learner-facing view over the existing runtime**, while automation that would own teaching or learner-state decisions remains evidence-gated.

This roadmap distinguishes **core teaching capabilities**, **product surfaces**, and **second-layer automation**. A capability such as choosing a useful diagram can belong to the core protocol, and a workspace can expose learner state, even when an automated renderer or specialist subagent remains deferred.

## Core now: representation-aware teaching

The teacher may already choose a compact diagram, plot, annotated derivation, tensor/shape map, local roadmap, or architecture sketch when it is the highest-value representation for the current cognitive move.

See [`VISUAL-TEACHING.md`](VISUAL-TEACHING.md).

A representation is part of teaching when it helps the learner read, predict, reconstruct, or translate a relation. It is not justified by aesthetics alone.

## Product layer now: Visual Learning Workspace

The first learner-facing product surface lives under:

```text
apps/workspace/
```

Its purpose is to expose the existing runtime clearly:

```text
MISSION + ROADMAP + STATE + longitudinal arc metadata
                         ↓
              Visual Learning Workspace
                         ↓
        map / canvas / evidence / timeline
```

The workspace is not a second source of learner truth. The current
implementation captures learner action and Project lifecycle changes through
guarded Runtime/server boundaries while keeping assessment, mastery, and
topology authority outside React.

See [`VISUAL-WORKSPACE.md`](VISUAL-WORKSPACE.md).

The authority-aware learner-response / agent bridge, headless Mission
Completion Gate, non-authoritative Workspace completion projection, and
learner-facing review of evidence-grounded state proposals are implemented.
State proposal accept/reject still delegates to Runtime authority and cannot be
turned into arbitrary self-declared mastery.

The typed Learning Library is also end-to-end usable: saved materials are
Project-local, provenance-aware, immutable, readable through a validated detail
boundary, explicitly curatable, and browsable through deterministic summary
filters without moving evidence interpretation into the client.

The next library step is operational validation through real Projects: observe
which saved and curated materials are actually revisited, which provenance is
useful when returning, and what deserves promotion at Archive. Final Learning
Pack generation remains deferred until that use establishes stable composition
semantics. Search/filter interaction itself must not become learner-state
Evidence, and the project should not add embedding/RAG infrastructure merely to
browse the local typed library.

## Core now: Mission completion verification

Mission criteria can require explanation, application, transfer, delayed
retrieval, context, scaffolding, independence, and repeated Evidence. Verified
completion requires distinct Feynman and independent-performance receipts,
then freezes the criteria and provenance before retained archival. The
Workspace can inspect that status and request the guarded transition, while
manual Archive remains visibly unverified. Automated review scheduling remains
separate work.

## Layer 1: Learning Memory

Current:

```text
MISSION
LEARNER
ROADMAP
STATE
```

Future:

```text
interaction evidence
        ↓
learner model update
        ↓
review priority
        ↓
next learning action
```

The workspace may visualize this state, but it must not infer durable learner conclusions merely from UI interaction.

## Layer 2: Spaced Review

Purpose:

Protect storage strength without turning the system into flashcards.

Rules:

- review unstable concepts;
- delay retrieval enough to require reconstruction;
- prioritize concepts with high dependency centrality;
- prefer transfer tasks over recognition.

A Review view may exist before a scheduler. Scheduling automation remains deferred until longitudinal evidence supports trigger semantics.

## Layer 3: Advanced Roadmap Interaction

The canonical roadmap, focused inspection surface, explicit topology proposal
review path, and node-level revision history are now usable in the Workspace.
A learner can enter a full-screen Map mode, inspect dependencies and downstream
unlocks, see the accepted Runtime mastery overlay, review an evidence-grounded
structural proposal before it becomes canonical, and inspect how one selected
node actually changed across immutable topology revisions.

Implemented foundations:

- canonical typed topology with explicit semantic edges;
- project-local Evidence requirement for topology writes;
- append-only revision and structural-delta history;
- generated `ROADMAP.md` projection;
- deterministic, disposable ELK layout;
- full-screen read-only Map mode;
- node inspection over topology relations plus accepted learner overlay;
- immutable LearningMap proposals bound to one base revision;
- learner accept/reject rationale in Map mode;
- stale-revision rejection before an accepted proposal can overwrite a newer map;
- accepted proposals passing through the same canonical map validators and revision writer;
- explicit separation between topology proposal authority and mastery proposal authority;
- validated node-level revision history derived from immutable revisions;
- before/after snapshots for meaningful node, frontier, and semantic-relation changes;
- integrity checking that current map state still matches the append-only revision chain.

See ADR 0003 and ADR 0007 plus [`LEARNING-MAP.md`](LEARNING-MAP.md).

What remains deferred is product-level interaction/automation such as:

- richer whole-map before/delta/after comparison when real use shows it is needed beyond node history;
- animated roadmap transitions when they clarify a meaningful structural change;
- large-graph navigation and filtering when real Projects require it;
- direct graph editing, which should not be promoted unless it solves a repeated learner-facing need;
- automatic proposal acceptance, which remains out of scope.

Selecting, opening, panning, zooming, reading revision history, or merely
reviewing a proposal is presentation-only and must not create Evidence or
update mastery. Only explicit proposal acceptance may write a new topology
revision, and that write remains subject to lifecycle, Evidence, revision, and
schema validation. The roadmap remains a living dependency hypothesis, not a
syllabus or completion chart.

## Layer 4: Research Agent

Purpose:

Separate source discovery from teaching.

Pipeline:

```text
source retrieval
        ↓
teacher synthesis
        ↓
learner interaction
```

The Workspace may expose a Source Drawer, but the agent should never replace teaching with a bibliography.

## Layer 5: Visualization Agent / Rendering Pipeline

Purpose:

Automate production of high-quality diagrams and figures only after repeated evidence shows that the core teacher cannot efficiently create the needed representation inline.

A visualization remains justified only when it clarifies a specific relation such as:

- dependency;
- mechanism;
- transformation;
- spatial relationship;
- quantitative pattern;
- tensor / matrix axis semantics;
- state or data flow.

The future agent should receive a **representation brief**, not a vague request to "make this visual":

```text
target inference
semantic objects
relations / axes / invariants
learner action
required fidelity
output medium
```

The existence of the Visual Learning Workspace does not itself justify a visualizer subagent.

## Layer 6: Obsidian / md-log

Purpose:

Provide a human-readable external memory layer.

Possible outputs:

- learning records;
- concept maps;
- questions;
- unresolved edges;
- references.

The source of truth remains the learner state model, not the notes.

## Promotion rule

Product surfaces may be promoted when they reduce interaction friction while preserving the teaching runtime's authority boundaries. Automation that changes learner state, schedules interventions, generates representations autonomously, or adds specialist agents should still require evidence that the complexity solves a repeated learning bottleneck.

The project should earn operational complexity through demonstrated learning value.
