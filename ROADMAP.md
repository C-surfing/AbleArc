# AbleArc roadmap

Status: **Learning-control-layer reset active**  
Decision date: **2026-10-01**

## Canonical direction

AbleArc is a **lightweight learning control layer for AI-assisted work**.

It does not need to own the conversation UI. ChatGPT, Claude, and other capable hosts should provide the interaction surface, files, tools, search, and whatever project/session memory they support.

AbleArc should focus on three hard problems:

1. longitudinal learner modeling;
2. high-value learning opportunity detection;
3. capability evidence across retrieval, debugging, application, and transfer.

The project should remain useful even as foundation models become much better teachers.

## Current architecture

    host conversation / project
              │
              ▼
        AbleArc control layer
     observe · decide · remember
              │
       learning opportunity?
        ├─ no → continue normally
        └─ yes
              │
      smallest useful intervention
              │
      prediction / debug / retrieve
      explain / transfer / perturb
              │
              ▼
       capability evidence update
              │
              ▼
      optional Learning Capabilities

## Phase C1 — control-layer reset

**In progress in this change.**

- redefine AbleArc away from a turn-by-turn tutor loop;
- make “continue normally” the dominant action;
- integrate Core / Review / Delegate;
- add learning-opportunity detection;
- elevate longitudinal learner state and capability trajectory;
- add ChatGPT Project and generic host adapters;
- keep explicit persistence compact;
- retain existing high-quality learning-material capabilities.

Exit criterion: AbleArc feels like normal fast AI usage, with only occasional high-value cognitive friction.

## Phase C2 — ChatGPT Project dogfood

Create real projects for several learning/work arcs such as:

- paper learning / Grad-CAM;
- CUDA;
- software architecture and debugging;
- research hypothesis development;
- embedded systems.

Evaluate:

- Did AbleArc stay out of the way during Delegate work?
- Did it correctly identify the few Core decisions?
- Were interventions high-information rather than frequent?
- Did project continuity improve later retrieval and transfer?
- Was LEARNING_STATE.md useful, or did host memory already suffice?
- Did the learner become more independent in debugging and design?

## Phase C3 — longitudinal evidence

Focus research and product work on capability trajectory:

- delayed retrieval;
- changed-context transfer;
- debugging independence;
- decreasing scaffold dependence;
- recurring misconception repair;
- understanding-debt detection;
- cross-project reuse of mental models.

Avoid fake mastery percentages.

## Phase C4 — capability routing

Refine when AbleArc should call specialized Learning Capabilities:

- Archify;
- University Skill;
- YouTube/Bilibili render-to-PDF;
- programming learning-by-building;
- corpus-to-skill;
- research/search;
- code execution;
- document/PDF packaging.

Optimize for the smallest artifact that improves learning.

## Phase C5 — portable packaging

Only after repeated dogfood:

- simplify installation across skill-compatible hosts;
- document host adapters;
- keep third-party capabilities optional;
- add minimal compatibility metadata where useful;
- avoid host-specific infrastructure unless it solves a repeated real failure.

## Explicit non-goals

Do not reintroduce these without repeated learner-visible evidence:

- first-party chat UI;
- Web dashboard;
- generic Learning OS;
- mandatory MCP server;
- custom provider layer;
- cloud learner database;
- transcript warehouse;
- deterministic receipt chain for ordinary learning;
- compulsory session setup;
- gamification;
- quiz-every-turn pedagogy.

## Research direction

A central question is:

    How can AI increase task productivity
    without decreasing long-term human capability?

One useful abstraction is to optimize both:

    Task Utility + λ · Δ Human Capability

rather than Task Utility alone.

This connects AbleArc naturally to longitudinal memory, context compression, learner modeling, intervention policy, credit assignment, retrieval scheduling, and human-agent delegation boundaries.

## Anti-bloat rule

Before adding a subsystem:

1. identify a repeated learner-visible failure;
2. show why a strong host + AbleArc policy + existing capabilities cannot handle it;
3. prefer clearer policy or a small adapter over infrastructure;
4. add code only when deterministic execution or validation is actually necessary;
5. preserve fast normal conversation as the default experience.

The smallest layer that protects real capability wins.
