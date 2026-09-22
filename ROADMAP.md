# Project roadmap

## Canonical current direction

AbleArc has completed **Kernel v1 implementation phases K1–K7** and is now in the **K8 longitudinal validation phase**.

**2026-09-22 host shift:** first-party Web expansion is paused. The next primary K8 host is the headless ChatGPT plugin defined by [ADR 0011](docs/adr/0011-headless-chatgpt-plugin-host.md) and [`docs/CHATGPT-PLUGIN.md`](docs/CHATGPT-PLUGIN.md): ChatGPT supplies the Teacher, the packaged Skill supplies the teaching workflow, MCP exposes a small Kernel control surface, and Runtime remains learner-truth authority. This is not a new Kernel phase; it is a lower-friction way to gather the real longitudinal evidence K8 already requires.

**2026-09-20 Web stabilization interrupt:** real Web dogfooding exposed blocking Host/provider/authority-path failures. K8 remains active, but the first-party Web path must pass the bounded stabilization gate in [`docs/WEB-STABILIZATION-2026-09-20.md`](docs/WEB-STABILIZATION-2026-09-20.md) / Issue #132 before Web failures are treated as clean evidence about Kernel pedagogy. Agent-mode K8 evidence may continue.

Current sources of truth:

- [`docs/KERNEL-V1.md`](docs/KERNEL-V1.md) — canonical Learning Kernel v1 architecture and anti-bloat boundary;
- [`docs/KERNEL-FIRST-ROADMAP.md`](docs/KERNEL-FIRST-ROADMAP.md) — current K1–K9 development order;
- [`docs/adr/0010-learning-kernel-boundary.md`](docs/adr/0010-learning-kernel-boundary.md) — accepted boundary between LLM teaching judgment and deterministic learner-truth invariants;
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture;
- [`docs/VNEXT-ROADMAP.md`](docs/VNEXT-ROADMAP.md) — implemented/product roadmap history and future product reference, subordinate when its delivery ordering conflicts with the Kernel-first roadmap.

The paper-first implementation chain is complete and remains the deepest proving scenario. Product/UI expansion stays subordinate while real multi-session use tests whether the current Kernel is expressively complete and stable enough to freeze.

## Current system shape

```text
Host / Product
Web · Agent/Skill · assistant integrations
                │
                ▼
         Learning Kernel
Mission · Map · Model · Context · Policy
Move · Observation · Evidence · Pacing
                │
                ▼
      Learning Runtime authority
receipts · state proposals · accepted projection
                │
                ▼
       local learner workspace
```

Supporting capabilities such as Research and LearningMaterial sit beside the Kernel and may provide context. They do not own learner truth.

## Current delivery checkpoint

Implemented baseline includes Mission/Project lifecycle, typed LearningMap, learner-state overlay, Runtime Evidence/authority, evidence-gated completion, Teach/Study policies, conversation-first Host context, DailyContext, Focus, Session Close/Tomorrow Seed, Reflection, Research, Paper Learning, learner-facing Map/Review, Learner Profile, assistant host, and graphical Web Provider setup.

Implementation status:

```text
K1–K7  complete
   ↓
K8  real longitudinal kernel dogfooding   ← active gate
   ↓
K9  Kernel v1 freeze
```

During K8, do not add a new Kernel abstraction merely because it is conceivable or because a checklist has an empty box. Change Kernel semantics only when real use reveals a repeated failure or a clearly structural high-consequence gap.

## Existing evidence gates remain open

- Issue #95 remains the real multi-session Paper Learning acceptance gate, including delayed retrieval and transfer.
- Issue #2 remains the broader longitudinal multi-domain evidence goal.
- Product Session Pacing presets / Pomodoro UX are deferred in Issue #110 and must remain Host/UI state.

Real learner evidence must not be fabricated to satisfy either longitudinal gate.

## Anti-bloat development rule

Before adding a subsystem or first-class abstraction:

1. identify the concrete learner-visible failure;
2. show why existing Kernel concepts cannot express the solution;
3. classify it as learner truth, LLM teaching judgment, supporting capability, or Host/UI state;
4. prefer LLM judgment when a hard rule is not required for integrity;
5. abstract only after repeated real use exposes the same structure.

A phase is not a feature checklist. The smallest coherent solution wins.

## Product work after Kernel freeze

After K9, product shape may again advance: Web UX, packaging, mobile/desktop, notifications, richer assistant/plugin integrations, and timer/break UX can consume the frozen Kernel without reopening learner-truth semantics by default.

Branding remains **AbleArc**; [`docs/BRANDING.md`](docs/BRANDING.md) is authoritative for naming.
