# AbleArc branding and product vocabulary

Status: **canonical**  
Updated: **2026-10-01**

## Public name

The public project and Skill name is **AbleArc**.

The name refers to a learner's capability arc: moving from dependence on assistance toward independent explanation, modification, debugging, transfer, and redesign.

## Canonical positioning

Use this description in current product and technical material:

> **AbleArc is a lightweight learning control layer for AI-assisted work.**

A shorter description is:

> **Preserve human judgment while working with AI.**

AbleArc is not a separate chat product. It is designed to live inside capable hosts such as ChatGPT Projects or Agent-Skill-compatible environments.

## Canonical vocabulary

Use these terms consistently:

- **AbleArc** — the project and canonical Agent Skill.
- **Learning Control Layer** — AbleArc's architectural role.
- **Learning Capability** — an optional specialized tool or external Skill that AbleArc may route to.
- **Learner model** — compact, revisable evidence about what the learner can actually do.
- **Learning opportunity** — a moment where preserving human reasoning is worth interrupting normal AI execution.
- **Core / Review / Delegate** — ownership levels for allocating human cognitive effort.
- **Capability evidence** — observed explanation, prediction, debugging, application, transfer, or delayed retrieval that should change future learning decisions.

## Retired product vocabulary

Do not use these names as current product components:

- AbleArc Learning OS
- AbleArc Learning Runtime
- AbleArc Learning Engine
- AbleArc Workspace
- first-party Web dashboard
- first-party MCP runtime
- provider/runtime layer
- deterministic receipt or transaction ledger

Historical ADRs may retain those names when documenting earlier architecture.

## Tagline

Preferred:

> **Delegate execution. Preserve judgment. Build mental models. Accumulate capability.**

Alternative short form:

> **Finish the work. Keep the judgment.**

## Repository identity

Canonical repository:

    C-surfing/AbleArc

Canonical Skill:

    skills/ablearc/

Canonical host adapters:

    adapters/chatgpt-project/
    adapters/generic/

Current architectural decision:

    docs/adr/0013-learning-control-layer.md

## Compatibility language

Do not claim that a host is "supported" merely because it appears compatible with the Agent Skills format.

Use explicit evidence levels:

- **CI-validated** — repository structure or Skill format is checked automatically.
- **adapter available** — a host-specific instruction adapter exists.
- **dogfooded** — the workflow has been used in a real session.
- **verified** — repeated real use has not exposed a known blocking incompatibility.

See docs/COMPATIBILITY.md.
