# AbleArc

**AbleArc is a personal Learning OS powered by an evidence-driven learning runtime.**

The goal is not to make AI explain more. The goal is to make the learner **more capable after each interaction** and make that capability change inspectable through evidence.

> Keep the whole map in view. Teach at the edge of understanding. Make the learner perform the important cognitive move.

AbleArc is evolving as two separable layers: a learner-facing Learning OS for daily use and a provider-neutral, local-first Learning Runtime that remains the source of learner truth.

```text
Learning OS → Entry / Today / Focus Session / Review
                   ↓
Learning Runtime → Mission / Map / Model / Move / Evidence
                   ↓
Learning Engine → Agent / Skill / CLI / API
```

The canonical vNext direction is [`ROADMAP.md`](ROADMAP.md), backed by [`docs/VNEXT-ROADMAP.md`](docs/VNEXT-ROADMAP.md) and the accepted ADRs.

```text
MAP   — Where could we go?
MODEL — What does the learner actually understand?
MOVE  — What is the best next cognitive action?
EVIDENCE — Did it actually land?
```

The internal system is rigorous; the external interaction should feel natural.

Representations are selected cognitive instruments. HTML is one renderer, not the teaching abstraction.

## Why

Normal AI learning tends to become many-to-many: one learner jumps among many books, videos, teachers, chats, interfaces, and explanations. The switching cost is not only logistical. It consumes working memory, fragments context, and makes trust expensive.

AbleArc tries to create one consistent teaching interface over many sources while preserving the strengths of excellent human teaching:

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

When used in a learning project, the Runtime maintains a small `.learning/` workspace:

```text
.learning/
├── workspace.json
├── LEARNER.md
└── projects/<project-id>/
    ├── project.json
    ├── missions/<mission-id>/MISSION.md
    ├── map/        # Canonical topology, revisions, Markdown projection
    ├── STATE.md
    ├── records/
    ├── references/
    └── runtime/    # Structured receipts + accepted mastery projection
```

The four important objects are intentionally separate:

- **MISSION** grounds what is worth learning.
- **LEARNER** stores durable teaching-relevant preferences, not a transcript.
- **LearningMap** is a revisable hypothesis about the dependency structure of the subject.
- **STATE** represents the learner now: stable, shaky, unknown, misconceptions, evidence, and next frontier.

A roadmap is not a chapter list. The canonical graph and learner overlay have separate authority and are joined for display.

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

The LLM still selects moves and interprets rich behavior. The Runtime makes those outputs inspectable, prevents observation from silently becoming learner state, rejects unsafe mastery promotion, and maintains a machine-operable projection of accepted concept-state changes. A single immediate correct answer cannot become `stable`; `transferable` requires evidence in a novel context.

See [`docs/RUNTIME-CONTRACT.md`](docs/RUNTIME-CONTRACT.md), the immutable legacy [`schemas/runtime-v0.1.json`](schemas/runtime-v0.1.json) contract, the scoped [`schemas/runtime-v0.2.json`](schemas/runtime-v0.2.json) contract, and [`tools/runtime.py`](tools/runtime.py).

The Workspace exposes a complete local handoff: **Your move** captures the learner response; any Teach/Study agent can read the pending response, commit information-rich feedback, and issue an evidence-grounded next decision through two high-level runtime commands. An optional server-only OpenAI-compatible adapter can perform that assessment automatically with strict structured output, but the same Runtime validates and commits the turn. The Workspace renders feedback and unlocks the next move without exposing ledger mechanics, auto-grading, or silently changing mastery.

## Local runner

The protocol remains usable without tooling, but v0.2 includes a tiny standard-library helper that removes repeated workspace bookkeeping without moving teaching policy into code:

```bash
printf '%s' '{"title":"Bayes","goal":"Explain and apply Bayes in unfamiliar decisions"}' | python tools/learning.py create-project -
python tools/learning.py projects
python tools/learning.py brief
python tools/learning.py map
python tools/learning.py completion-status
python tools/learning.py materials
python tools/learning.py start-arc probability bayes-base-rate
python tools/learning.py start-arc procedural linked-list-skill
python tools/learning.py new-session <arc>
python tools/vnext_product_dogfood.py --repo . start <arc> --entry-mode workspace
python tools/vnext_product_dogfood.py --repo . validate <arc>
python tools/vnext_product_dogfood.py --repo . summary <arc>
python tools/learning.py status
python tools/learning.py doctor
python tools/runtime.py --repo . verify
```

`create-project` initializes workspace-v0.2, stores an explicit learner goal, and opens one fixed representative-attempt probe so the learner can act immediately. It does not invent a map, domain model, or mastery claim. The legacy `init` / `start-mission` path remains compatible; migrate it before creating additional Projects. Real arc evidence is scaffolded under Git-ignored `.dogfooding/`, while `.learning/` remains the operational learner state. Domain teaching and roadmap revision remain responsibilities of the Teach/Study protocol.

For workspace-v0.2, the roadmap is a canonical typed LearningMap with explicit semantic edges and append-only, Evidence-grounded revisions. Learner mastery remains in the Runtime state projection; the Workspace joins it onto the map and uses ELK for deterministic layout. See [`docs/LEARNING-MAP.md`](docs/LEARNING-MAP.md).

The official Workspace exposes the same Project lifecycle and a concise session-start brief. Paused and archived Projects become read-only in both the UI and Runtime; archived maintenance must be opened explicitly before new evidence can be recorded.

The Workspace also projects the headless Completion Gate and can request the guarded Complete + Archive transition. React never decides that learning is complete: the Python gate revalidates Mission scope, pending responses, criteria thresholds, and distinct Feynman/performance Evidence before commit.

Mission completion is a separate, evidence-gated authority path. A Mission must cite distinct qualifying Runtime Evidence for Feynman reconstruction and independent performance before `complete-project` can freeze an immutable completion record and archive the retained Project. Manual Archive does not claim mastery. See [`docs/MISSION-COMPLETION.md`](docs/MISSION-COMPLETION.md).

The selected Project also has a typed Learning Library. Reusable derivations, worked examples, source notes, code, diagrams, misconception repairs, and final Feynman explanations are saved deliberately with a `why_return` and Evidence or source provenance. They remain non-authoritative for mastery and are not automatic chat summaries. See [`docs/LEARNING-LIBRARY.md`](docs/LEARNING-LIBRARY.md).

The repository has automated CI for the runner and repository invariants. See [`tools/README.md`](tools/README.md).

## Design and evaluation documents

- [`ROADMAP.md`](ROADMAP.md) — canonical vNext roadmap entry point.
- [`docs/VNEXT-ROADMAP.md`](docs/VNEXT-ROADMAP.md) — product thesis, authority model, promotion gates, and phased delivery.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — state model, control loop, persistence, mode selection.
- [`docs/adr/`](docs/adr/) — accepted product/runtime boundaries and compatibility consequences.
- [`docs/PROJECT-STORAGE.md`](docs/PROJECT-STORAGE.md) — v0.2 Workspace/Project/Mission manifests and legacy read compatibility.
- [`docs/LEARNING-MAP.md`](docs/LEARNING-MAP.md) — canonical topology, evidence-grounded revisions, Runtime overlay, and deterministic rendering.
- [`docs/MISSION-COMPLETION.md`](docs/MISSION-COMPLETION.md) — evidence criteria, Feynman/performance gate, immutable completion, and retained Archive semantics.
- [`docs/LEARNING-LIBRARY.md`](docs/LEARNING-LIBRARY.md) — typed reusable materials, provenance, lifecycle, and safe Workspace projection.
- [`docs/PAPER-LEARNING.md`](docs/PAPER-LEARNING.md) — paper-first source reconstruction, prerequisite hypotheses, onboarding budget, and first teaching move.
- [`docs/RESEARCH-CAPABILITY.md`](docs/RESEARCH-CAPABILITY.md) — bounded Teacher-invoked source verification with provenance, minimized audit, and no learner-state authority.
- [`docs/ASSISTANT-HOST.md`](docs/ASSISTANT-HOST.md) — token-protected thin ChatGPT/assistant transport over the same Project, HostTurn, and learner-state read model.
- [`docs/LEARNER-MAP-REVIEW.md`](docs/LEARNER-MAP-REVIEW.md) — learner-facing map projection and optional descriptive review suggestions without scheduling authority.
- [`docs/LEARNER-PROFILE.md`](docs/LEARNER-PROFILE.md) — editable workspace-scoped teaching context that stays separate from mastery and transcripts.
- [`docs/AGENT-ADAPTER.md`](docs/AGENT-ADAPTER.md) — Provider configuration, strict turn contract, failure handling, and authority boundary.
- [`docs/USER-FIRST-PRODUCT.md`](docs/USER-FIRST-PRODUCT.md) — learner journey, open-source lessons, and the architecture budget.
- [`docs/TEACHING-TASTE.md`](docs/TEACHING-TASTE.md) — the qualitative teaching standard.
- [`docs/VISUAL-TEACHING.md`](docs/VISUAL-TEACHING.md) — representations as cognitive instruments, semantic contracts, and visual audits.
- [`docs/LEARNING-ARTIFACTS.md`](docs/LEARNING-ARTIFACTS.md) — typed, learner-operable representations and the first frequency-tree renderer.
- [`docs/PRACTICE-PROGRESSION.md`](docs/PRACTICE-PROGRESSION.md) — connected practice that varies assumptions, boundaries, or representations.
- [`docs/DOGFOODING.md`](docs/DOGFOODING.md) — longitudinal evidence and iteration protocol.
- [`docs/SECOND_LAYER_ROADMAP.md`](docs/SECOND_LAYER_ROADMAP.md) — deferred infrastructure and expansion boundaries.
- [`docs/REFERENCES.md`](docs/REFERENCES.md) — sources and inspirations.
- [`evaluation/README.md`](evaluation/README.md) — capability-delta evidence standards and execution flow.
- [`evaluation/ARC.md`](evaluation/ARC.md) — cross-session contract for one longitudinal learning arc.
- [`evaluation/RUNBOOK.md`](evaluation/RUNBOOK.md) — operational procedure for running real dogfooding.
- [`evaluation/VNEXT-PRODUCT-DOGFOOD.md`](evaluation/VNEXT-PRODUCT-DOGFOOD.md) — descriptive product-surface checkpoints before Phase 4 promotion.
- [`evaluation/PRIVACY.md`](evaluation/PRIVACY.md) — local/private learner-evidence boundary and public minimization rules.
- [`evaluation/PROMOTION.md`](evaluation/PROMOTION.md) — evidence gate before changing general Teach/Study rules.
- [`evaluation/DOMAINS.md`](evaluation/DOMAINS.md) — probability, mathematics, paper reading, programming/Agent, conceptual, and procedural/skill-acquisition test matrix.
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

## Naming and compatibility

**AbleArc** is the public product brand and `C-surfing/AbleArc` is the canonical GitHub repository. Existing persisted `.learning/` data, schema identifiers, and compatibility surfaces are not renamed merely for branding. `AI4LEARNING_*` Provider environment variables remain accepted as legacy aliases while `ABLEARC_*` names are preferred. Historical repository URLs may continue to resolve through GitHub redirects, but new links and integrations should use `C-surfing/AbleArc`.

## Status

**v0.1 — complete first usable protocol.** Teach + Study, persistent learner state, dynamic roadmap, evidence-aware mastery, Feynman model debugging, teaching taste, bootstrap/agent metadata, and behavioral acceptance scenarios are in place.

**v0.2 — learning runtime foundation established.** The evaluation layer, structured transaction runtime, conservative authority policy, cross-agent JSON contract, local runner, unit tests, CI, project lifecycle, typed LearningMap, Learning Library, completion gate, proposal review, learner-state replay, and longitudinal review observations are available.

**vNext — Learning OS product phase.** Development now follows [`docs/VNEXT-ROADMAP.md`](docs/VNEXT-ROADMAP.md): Entry → Today → DailyContext → Focus Session → conversation-first correction / host context → Session Close → Reflection → authority refinement → capabilities → review. The former Capture Inbox hypothesis was not promoted after dogfooding and is no longer part of the canonical architecture. Runtime authority remains binding throughout.
