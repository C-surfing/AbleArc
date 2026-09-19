# Kernel-first Development Roadmap

Status: **canonical near-term development order**  
Date: 2026-09-19

This roadmap supersedes the product-first delivery ordering in `docs/VNEXT-ROADMAP.md` for current development priority.

The first-party Web, external assistant host, Paper Learning, Research Capability, learner-facing Map/Review, Learner Profile, Reflection, and Session Close remain valid implemented product slices. They are not the near-term driver.

The immediate goal is to make the **Learning Kernel complete, coherent, minimal, and hard to bloat**, then validate it longitudinally before resuming product/UI expansion.

## K1 — Kernel boundary consolidation — Issue #111

Goal: make the architecture say exactly what belongs to the Kernel and remove deterministic teaching constraints that should be LLM judgment.

Deliver:

- canonical `docs/KERNEL-V1.md`;
- ADR for LLM judgment vs deterministic invariants;
- architecture/roadmap alignment;
- audit existing code for duplicated or over-hard-coded policy;
- convert failure-mode intervention allow-lists from validator rules into teaching guidance;
- no new product surface.

Acceptance:

- learner-truth invariants remain enforced;
- a valid pedagogical move is not rejected merely because it was not in a hand-maintained failure-mode allow-list;
- contributors can identify Kernel vs Host vs Capability vs Runtime authority.

## K2 — Challenge Calibration — Issue #112

Goal: make adaptive difficulty explicit without fake precision.

Contract:

```text
unknown | underloaded | productive | overloaded
```

Implementation should prefer LLM interpretation from existing Evidence dimensions rather than numeric thresholds.

Do not add a universal difficulty score or target error percentage.

## K3 — Evidence Freshness + Review Policy — Issue #113

Status: implementation in this phase derives deterministic freshness facts from Runtime Evidence and leaves review-worthiness to non-authoritative Teacher policy.

Goal: distinguish old evidence from current verification without automatic mastery decay.

Deliver:

- freshness facts derived from accepted Evidence history without hidden due dates;
- review-worthiness judged from freshness + dependency importance + uncertainty + evidence strength + transfer relevance;
- no automatic state demotion from elapsed time;
- clean boundary for later FSRS/SM-2 scheduling outside learner truth.

## K4 — Session Policy — Issue #114

Goal: make `continue / pause / close` an explicit learning-policy output.

Deliver:

- consolidation-aware stopping guidance;
- cognitive-unit completion before timer-driven breaks;
- no timer or countdown data in learner truth;
- no product UI expansion in this phase.

Product timer presets remain deferred to Issue #110.

## K5 — Retrieval-before-refresh consolidation — Issue #114

Goal: make delayed reconstruction the default strengthening behavior while preserving Teacher judgment.

Deliver:

- Study policy defaults to retrieval across meaningful delay;
- explicit override when learner intent or pedagogy calls for recap/explanation;
- no rigid forced-quizzing state machine.

## K6 — Metacognitive Calibration — Issue #115

Goal: compare learner self-report with observed capability without building a psychometric profile.

Deliver:

- self-report remains separate from Evidence;
- lightweight derived routing interpretation: aligned / possible overestimate / possible underestimate / unknown;
- no numeric confidence score;
- no permanent personality label.

## K7 — Kernel facade + code cleanup — Issue #116

Goal: expose one coherent integration boundary without creating a monolith.

Preferred shape:

```text
Host
  ↓
LearningKernel facade
  ├── inspect learning state
  ├── choose/propose next move
  ├── assess observation
  ├── derive review recommendation
  └── derive pacing recommendation
  ↓
existing Runtime authority + persistence
```

Rules:

- compose existing domain modules;
- avoid `*Manager` / `*Service` proliferation;
- prefer pure functions and typed data;
- remove duplicated glue discovered during consolidation;
- do not rewrite working Runtime merely to match a class diagram.

## K8 — Longitudinal kernel dogfooding — Issues #95 and #2

Validate at minimum:

- Paper learning;
- Mathematics;
- Programming / Agent systems;
- Conceptual learning.

The existing five-domain Issue #2 remains the broader evidence target. Paper Issue #95 remains open until real delayed retrieval and transfer occur.

No simulated learner evidence may satisfy these gates.

## K9 — Kernel v1 freeze — tracked by Issue #117

Freeze when:

1. the Kernel expresses Mission → Map → Model → Context → Policy → Move → Evidence → Update → Pacing → delayed retrieval/transfer coherently; and
2. longitudinal use stops revealing missing first-class kernel abstractions.

After freeze, new product/UI/distribution work should consume the Kernel rather than mutate it by default.

## Deferred product work

Until K9, do not prioritize:

- visual redesign;
- desktop packaging;
- mobile app;
- notification transport;
- Pomodoro UX beyond existing minimal support;
- course marketplace / LMS features;
- generic knowledge center;
- large RAG/vector stack;
- broad plugin framework;
- gamification;
- health/sleep/caffeine tracking.

Record useful product hypotheses as deferred Issues when necessary, but do not let them drive Kernel design.

## Engineering rule

Before adding a first-class abstraction, answer:

1. Which concrete learning failure requires it?
2. Why can the existing Kernel concepts not express the behavior?
3. Is the behavior learner truth, teaching judgment, a supporting capability, or Host/UI operational state?
4. Could the LLM make this judgment without a new deterministic subsystem?
5. What real longitudinal evidence would justify keeping the abstraction?
