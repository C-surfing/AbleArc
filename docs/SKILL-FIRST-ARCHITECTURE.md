# AbleArc Skill-first architecture

Status: **canonical**  
Date: 2026-09-22

## 1. Product boundary

AbleArc is a learning policy packaged as an Agent Skill.

It does not require a dedicated user interface, server, provider abstraction, database, MCP transport, or transaction ledger to be useful.

The host conversation is the presentation surface. The model's teaching judgment is the primary control mechanism.

    Learner conversation
            │
            ▼
       AbleArc Skill
            │
            ├── direct teaching
            ├── learner action
            ├── lightweight review
            └── optional companion skills/tools

## 2. Minimal learning state

Only four concepts are first-class.

### Goal

The observable capability the learner wants to build.

Examples:

- explain why shared memory can outperform relying on cache alone;
- derive gradient descent from a simple loss;
- implement and reason about a linked list;
- read a specific paper independently.

### Model

A compact, revisable interpretation of the learner's current understanding.

It may include useful prior knowledge, uncertain knowledge, misconceptions, the learner's current explanatory model, evidence from learner actions, and durable preferences relevant to teaching.

It is not a psychometric profile and does not need numeric mastery percentages.

### Frontier

The most valuable unresolved point to work on now.

The frontier may be a missing prerequisite, misconception, relation between known concepts, weak retrieval target, application step, or transfer opportunity.

### Move

One bounded cognitive action selected to advance the frontier.

Typical moves include explain, retrieve, predict, derive, contrast, apply, repair, teach-back, visualize, worked-example, generate-reference, transfer, and pause.

## 3. Default control loop

    GOAL
      ↓
    MODEL
      ↓
    FRONTIER
      ↓
    MOVE
      ↓
    LEARNER RESPONSE / INTERACTION
      ↓
    MODEL UPDATE
      ↓
    NEXT FRONTIER OR STOP

This loop is conceptual. Do not expose phase labels unless they are useful to the learner.

## 4. Evidence without ceremony

Evidence remains important, but ordinary learning does not require an append-only transaction protocol.

Use learner performance to distinguish roughly:

    recognition < recall < explanation < application < transfer

A correct immediate answer may justify a local teaching decision without being promoted into a permanent mastery claim.

Persist evidence only when future routing benefits from remembering it.

## 5. Persistence boundary

AbleArc should work with zero persistence.

If the host supports useful durable state, retain only compact teaching state: goal, frontier, durable learner preferences, important misconceptions or uncertainty, decisive evidence summary, and review candidates.

Do not maintain a full transcript or a complex workspace schema by default.

## 6. Companion-skill boundary

AbleArc owns **selection**, not every implementation.

AbleArc may decide that a mechanism diagram is the best next move; Archify handles producing the high-quality visual.

AbleArc may decide that the learner needs a substantial reusable course artifact; University Skill handles producing the textbook or coursebook.

The artifact returns to AbleArc's learning loop. Reading or generating it does not itself count as understanding.

Companions are optional. The Skill must degrade gracefully when they are absent.

## 7. Why the reset

The previous architecture correctly protected learner truth, but accumulated product and protocol surfaces: Web workspace, provider configuration, MCP host, ChatGPT plugin package, runtime receipts, typed transaction chains, and material-generation provider flows.

For research into inspectable learning state, those mechanisms can be useful. For everyday use, they introduced deployment, tooling, and interaction cost before the learner received value.

The reset preserves the strongest ideas: capability delta, frontier teaching, evidence over vibes, retrieval and transfer, learner-provided context, natural interaction, and anti-bloat boundaries.

It removes the assumption that those ideas require a product shell.

## 8. Architecture test

A new feature belongs in AbleArc only when at least one is true:

1. it materially improves selection of the next cognitive move;
2. it preserves compact teaching-relevant learner state;
3. it helps choose or coordinate a companion capability;
4. it prevents a repeated learning failure that instructions alone cannot reliably prevent.

Otherwise it should remain outside the core Skill.
