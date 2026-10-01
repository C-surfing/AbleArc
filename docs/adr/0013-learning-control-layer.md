# ADR 0013 — Reframe AbleArc as a learning control layer

Status: **Accepted**  
Date: **2026-10-01**

## Context

ADR 0012 correctly reset AbleArc from a heavy Learning OS into a lightweight Skill.

Real usage then exposed a second problem.

A sufficiently strong foundation model plus a good learning prompt can already perform many local teaching behaviors well:

- explain;
- scaffold;
- ask for predictions;
- use Feynman-style reconstruction;
- generate worked examples;
- guide practice.

If AbleArc's main value is merely “a longer prompt that makes the model teach better,” its differentiation shrinks as models improve.

The existing one-move-at-a-time framing can also make learning feel fragmented: small explanation, small question, wait, repeat. This creates interaction cost even when the learner primarily wants fast execution.

At the same time, AI-assisted work creates a growing longitudinal problem: task completion can rise while human judgment, debugging ability, design intuition, and transferable mental models fail to accumulate.

## Decision

AbleArc becomes a **lightweight learning control layer for AI-assisted work**.

Its durable core is:

1. **Longitudinal learner model** — what capability evidence exists across time.
2. **Learning opportunity detection** — when human reasoning is worth preserving versus when AI should simply execute.
3. **Capability evidence and trajectory** — whether the learner can explain, apply, debug, transfer, and retrieve with decreasing support.

The common path is normal host usage.

The most common AbleArc action is **continue normally**.

Interventions should be sparse and high-information.

## Work × Learn ownership

AbleArc adopts three coarse ownership levels:

- **Core** — learner should eventually explain, modify, debug, and redesign.
- **Review** — learner should understand and judge quality.
- **Delegate** — AI should own low-value mechanical execution.

Usually only 1–3 Core targets should be active in one phase.

## Host boundary

AbleArc will not rebuild the conversation experience.

ChatGPT, Claude, and similar hosts should remain the primary UI where they provide superior interaction speed, file handling, search/tools, and project continuity.

AbleArc provides host adapters such as ChatGPT Project Instructions and a generic system prompt, while the detailed Skill remains canonical.

## Learning Capabilities

Existing high-quality material and representation integrations remain important.

They are reframed from “companion tutor flows” into **Learning Capabilities** that AbleArc can route to when useful:

- Archify;
- University Skill;
- youtube-render-pdf / bilibili-render-pdf;
- skills-for-learning;
- corpus-to-skill;
- research/search;
- code execution;
- document/PDF tooling.

AbleArc owns the decision to invoke them, not their implementation.

## Persistence

Explicit persistence remains optional and compact.

When a host already remembers project chats/files, AbleArc should not duplicate them.

An explicit learning-state file should contain only future-decision-relevant compression: mission, Core targets, frontier, decisive evidence, misconceptions, understanding debt, and review/transfer candidates.

## Consequences

### Positive

- normal interaction remains fast;
- learning friction becomes intentional rather than constant;
- AbleArc complements stronger foundation models;
- ChatGPT Projects and similar hosts become natural deployment surfaces;
- previous investment in learning-material skills remains useful;
- longitudinal memory/evidence becomes the real research surface.

### Negative

- local tutoring behavior becomes less visibly “special”;
- effectiveness depends on subtle intervention timing;
- host memory/project capabilities differ;
- longitudinal evaluation is harder than measuring artifact output.

These trade-offs are accepted.

## Research implication

AbleArc now centers a broader human–AI collaboration question:

> How can AI increase task productivity without decreasing long-term human capability?

A useful conceptual objective is:

    Task Utility + λ · Δ Human Capability

The project should study learner memory, context compression, intervention policy, understanding debt, retrieval scheduling, transfer, and human-agent delegation boundaries rather than optimizing for more tutoring ceremony.

## Supersedes

This ADR refines ADR 0012.

The Skill-first reset remains valid. The change is that AbleArc is no longer primarily framed as a turn-by-turn adaptive tutor; it is a longitudinal control layer embedded in normal AI-assisted work.
