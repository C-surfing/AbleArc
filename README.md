# ai4learning

A lightweight, stateful **AI teaching and study protocol** for learning with agents.

The goal is not to make an AI explain more. The goal is to make the learner **more capable after each interaction**.

> Keep the whole map in view. Teach at the edge of understanding. Make the learner perform the important cognitive move.

`ai4learning` is designed as a headless, stateful learning runtime: Skills and apps are adapters over an adaptive control loop, not the source of learner truth.

```text
MAP   — Where could we go?
MODEL — What does the learner actually understand?
MOVE  — What is the best next cognitive action?
EVIDENCE — Did it actually land?
```

The internal system is rigorous; the external interaction should feel natural.

```text
Core runtime → Teach / Study skill, agent, CLI, or app
             → conversation, diagram, exercise, HTML, or notebook artifact
```

Representations are selected cognitive instruments. HTML is one renderer, not the teaching abstraction.

## Why

Normal AI learning tends to become many-to-many: one learner jumps among many books, videos, teachers, chats, interfaces, and explanations. The switching cost is not only logistical. It consumes working memory, fragments context, and makes trust expensive.

This project tries to create one consistent teaching interface over many sources while preserving the strengths of excellent human teaching:

- a global structural view of the subject;
- teaching at the learner's current frontier;
- one important reasoning step at a time;
- motivated discovery instead of arbitrary fact delivery;
- Feynman-style explanation as model debugging;
- retrieval, application, and transfer as evidence of learning;
- persistent state across sessions;
- source verification without turning study into research logistics.

The target is **capability delta**, not information delivered.

```text
Before: I cannot reason about X independently.
After:  I can derive, explain, apply, or transfer X independently.
```

## Teaching taste

The central design rule is:

> **Never steal the learner's moment of discovery.**

The teacher should know more than it reveals. It should locate the misunderstanding before correcting it, repair models rather than sentences, introduce terminology after intuition when possible, and make every example do instructional work.

A good explanation should eventually feel inevitable: when the result appears, the learner can see why it had to appear.

This does **not** mean endless Socratic questioning. The agent chooses between direct explanation, guided discovery, worked examples, analogy, visualization, practice, retrieval, and challenge based on the learner's state and the cognitive move required.

## Core loop

```text
ORIENT
  ↓
PROBE
  ↓
LOCATE FRONTIER
  ↓
SELECT ONE LEARNING MOVE
  ↓
TEACH / ASK / DEMONSTRATE
  ↓
LEARNER ACTS
  ↓
VERIFY
  ↓
REPAIR or ADVANCE
  ↓
UPDATE MODEL + ROADMAP
```

The learner should not normally see these phase labels. They should experience a coherent conversation.

## Persistent learning workspace

When used in a learning project, the skill maintains a small `.learning/` workspace:

```text
.learning/
├── MISSION.md     # Why this matters; what success means
├── LEARNER.md     # Durable learning preferences and learner-specific constraints
├── ROADMAP.md     # Knowledge/dependency map + learner overlay
├── STATE.md       # Current frontier, misconceptions, evidence, next move
├── records/       # Significant learning-state changes
├── references/    # Optional compressed reference material
└── runtime/       # Structured receipts + accepted state projection
```

The four important objects are intentionally separate:

- **MISSION** grounds what is worth learning.
- **LEARNER** stores durable teaching-relevant preferences, not a transcript.
- **ROADMAP** is a revisable hypothesis about the dependency structure of the subject.
- **STATE** represents the learner now: stable, shaky, unknown, misconceptions, evidence, and next frontier.

A roadmap is not a chapter list. It is a dependency graph with a learner overlay.

```text
Vectors ● ──→ Covectors ◐ ──→ Wedge product ○ ──→ Differential forms ○
                 ↑
            YOU ARE HERE

○ unknown   ◔ exposed   ◐ developing   ● stable   ◆ transferable
```

## Teach and study are different modes

**Teach mode** grows the model: motivate, establish, connect, verify.

**Study mode** strengthens and tests it: retrieval first, targeted repair, interleaving, application, transfer, and spaced re-checks. The agent should not re-explain material before giving the learner a chance to retrieve it.

The same learner state powers both.

## Feynman, upgraded

"Explain it in your own words" is not enough. A teach-back is treated as a model-debugging artifact. The agent looks for:

- unexplained jumps;
- borrowed terminology hiding missing understanding;
- vague causal language;
- contradictions;
- missing mechanisms;
- statements that can be recited but not used.

It then chooses **one** gap to challenge or repair. The goal is a better mental model, not a prettier paraphrase.

## Evidence, not vibes

Understanding is tracked by evidence, not by the agent saying "great job". The protocol distinguishes:

```text
recognition < recall < explanation < application < transfer
```

Immediate fluency is not treated as long-term mastery. A concept can remain `developing` even after a correct answer; stronger states require stronger, preferably independent evidence.

The v0.2 evaluation phase makes this explicit: longitudinal arcs record capability before/after, selected cognitive moves, decisive learner evidence, learner-model and roadmap revisions, representation switches, later retrieval/transfer, and runtime failures. See [`evaluation/README.md`](evaluation/README.md) and [`evaluation/RUNBOOK.md`](evaluation/RUNBOOK.md).

## Agent compatibility

The primary skill lives at [`skills/teach/SKILL.md`](skills/teach/SKILL.md). A thin [`skills/study/SKILL.md`](skills/study/SKILL.md) entry activates the same protocol with a study-first posture.

For agents with native skill loading, copy or symlink the relevant skill directory into that agent's skill location. For agents without native skill loading, use [`prompts/bootstrap.md`](prompts/bootstrap.md) and point it at this repository.

See [`docs/USAGE.md`](docs/USAGE.md) for recommended workflows and commands.

## Structured transaction runtime

Meaningful turns can now produce an append-only, authority-aware chain:

```text
DecisionProposal → Observation → EvidenceReceipt
                 → StateProposal → authority decision → TurnReceipt
```

The LLM still selects moves and interprets rich behavior. The runtime makes those outputs inspectable, prevents observation from silently becoming learner state, rejects unsafe mastery promotion, and maintains a machine-operable projection of accepted concept-state changes. A single immediate correct answer cannot become `stable`; `transferable` requires evidence in a novel context.

See [`docs/RUNTIME-CONTRACT.md`](docs/RUNTIME-CONTRACT.md), [`schemas/runtime-v0.1.json`](schemas/runtime-v0.1.json), and [`tools/runtime.py`](tools/runtime.py).

## Local runner

The protocol remains usable without tooling, but v0.2 includes a tiny standard-library helper that removes repeated workspace bookkeeping without moving teaching policy into code:

```bash
python tools/learning.py init
python tools/learning.py start-arc probability bayes-base-rate
python tools/learning.py new-session <arc>
python tools/learning.py status
python tools/learning.py doctor
python tools/runtime.py --repo . verify
```

`init` never overwrites existing learner state. Real arc evidence is scaffolded under Git-ignored `.dogfooding/`, while `.learning/` remains the operational learner state. The runner does not infer mastery, select teaching moves, or revise the roadmap; those remain responsibilities of the Teach/Study protocol.

The repository now has automated CI for the runner and repository invariants. See [`tools/README.md`](tools/README.md).

## Design and evaluation documents

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — state model, control loop, persistence, mode selection.
- [`docs/TEACHING-TASTE.md`](docs/TEACHING-TASTE.md) — the qualitative teaching standard.
- [`docs/VISUAL-TEACHING.md`](docs/VISUAL-TEACHING.md) — representations as cognitive instruments, semantic contracts, and visual audits.
- [`docs/PRACTICE-PROGRESSION.md`](docs/PRACTICE-PROGRESSION.md) — connected practice that varies assumptions, boundaries, or representations.
- [`docs/DOGFOODING.md`](docs/DOGFOODING.md) — longitudinal evidence and iteration protocol.
- [`docs/SECOND_LAYER_ROADMAP.md`](docs/SECOND_LAYER_ROADMAP.md) — deferred infrastructure and expansion boundaries.
- [`docs/REFERENCES.md`](docs/REFERENCES.md) — sources and inspirations.
- [`evaluation/README.md`](evaluation/README.md) — capability-delta evidence standards and execution flow.
- [`evaluation/ARC.md`](evaluation/ARC.md) — cross-session contract for one longitudinal learning arc.
- [`evaluation/RUNBOOK.md`](evaluation/RUNBOOK.md) — operational procedure for running real dogfooding.
- [`evaluation/PRIVACY.md`](evaluation/PRIVACY.md) — local/private learner-evidence boundary and public minimization rules.
- [`evaluation/PROMOTION.md`](evaluation/PROMOTION.md) — evidence gate before changing general Teach/Study rules.
- [`evaluation/DOMAINS.md`](evaluation/DOMAINS.md) — probability, mathematics, paper reading, programming/Agent, and conceptual-learning test matrix.
- [`evaluation/REPRESENTATIONS.md`](evaluation/REPRESENTATIONS.md) — evaluate learning value of visual and non-visual representations.
- [`evaluation/FAILURE-TAXONOMY.md`](evaluation/FAILURE-TAXONOMY.md) — classify failures before modifying the protocol.
- [`evaluation/SESSION.md`](evaluation/SESSION.md) — template for a meaningful session record.
- [`evaluation/arcs/`](evaluation/arcs/) — launch briefs for the five required v0.2 arcs.
- [`tools/README.md`](tools/README.md) — local workspace / arc runner and CI commands.
- [`tests/SCENARIOS.md`](tests/SCENARIOS.md) — single-session behavioral acceptance scenarios.
- [`tests/VISUAL-SCENARIOS.md`](tests/VISUAL-SCENARIOS.md) — representation-aware acceptance scenarios.
- [`tests/LONGITUDINAL-SCENARIOS.md`](tests/LONGITUDINAL-SCENARIOS.md) — cross-session continuity and adaptation scenarios.

## Influences

This project is strongly influenced by Matt Pocock's stateful `teach` skill, Eero Alvar's AI-learning workflow and learning philosophy, the Feynman technique, zone-of-proximal-development thinking, desirable difficulty, retrieval practice, 3Blue1Brown-style motivated representations, Alchemist-Jo's `textbook-anything`, and `tensor-formula-viz`'s semantically faithful technical visualization discipline.

The project intentionally does not clone any one of those systems. It turns compatible ideas into a compact learner-model protocol with a dynamic roadmap, natural interaction layer, representation-aware teaching, and evidence-driven iteration.

## Status

**v0.1 — complete first usable protocol.** Teach + Study, persistent learner state, dynamic roadmap, evidence-aware mastery, Feynman model debugging, teaching taste, bootstrap/agent metadata, and behavioral acceptance scenarios are in place.

**v0.2 — longitudinal evidence phase in progress.** The evaluation layer, structured transaction runtime, conservative authority policy, cross-agent JSON contract, local runner, unit tests, and CI are available. The Workspace can project accepted structured state, decision rationale, and evidence provenance while retaining Markdown compatibility. The five real learner arcs are **not yet complete** and no simulated learner outcome counts as progress. Model/provider transport, automatic artifact rendering, scheduling, and specialized subagents remain deferred until evidence justifies them.
