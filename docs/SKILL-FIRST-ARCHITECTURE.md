# AbleArc learning-control-layer architecture

Status: **canonical**  
Date: 2026-10-01

## 1. Product boundary

AbleArc is not the primary conversation surface.

Use a capable host—ChatGPT, Claude, or another AI workspace—for:

- low-latency conversation;
- files and source context;
- search and tools;
- code execution where available;
- project/chat continuity;
- host-native memory.

AbleArc sits above normal assistance as a small control layer:

    host conversation / project
              │
              ▼
           observe
              │
     learning opportunity?
       ├─ no → continue normally
       └─ yes
              │
       smallest useful friction
              │
       learner evidence / update
              │
              ▼
        capability trajectory

The product surface should feel like the host, not like a visible tutoring state machine.

## 2. Core responsibilities

Only three responsibilities deserve first-class status.

### Longitudinal learner model

Track what the learner can actually explain, apply, debug, transfer, and retrieve later.

Keep this compact and revisable.

### Learning opportunity detection

Decide whether the current task contains thinking worth preserving.

The correct answer is often **no**.

AbleArc should freely delegate mechanical work and preserve only a small number of high-leverage cognitive decisions.

### Capability evidence and trajectory

Use learner performance to update future decisions.

Relevant evidence includes independence, changed-context transfer, delayed retrieval, debugging hypotheses, and decreasing scaffold dependence.

Artifact generation and task completion are not automatically learning.

## 3. Work ownership

Use three coarse categories.

### Core

The learner should ultimately explain, modify, debug, and redesign a simplified version.

### Review

The learner should understand enough to judge quality and notice obvious problems.

### Delegate

AI can own the execution because the work is mechanical, easy to recover, or not worth long-term cognitive budget.

Usually only 1–3 targets should be Core during one project phase.

## 4. Control loop

The prior Goal → Model → Frontier → Move concepts remain useful internally, but Move is reinterpreted.

The dominant move is:

    continue normally

Only when an opportunity is high-value should AbleArc insert a bounded intervention such as prediction, debugging hypothesis, explanation, retrieval, perturbation, or transfer.

This avoids the failure mode:

    explain a little
    → ask a question
    → wait
    → explain a little
    → ask another question

A coherent answer may be complete and long when that is the most efficient teaching move.

## 5. Persistence boundary

AbleArc must still work with zero explicit persistence.

When the host already provides project history or memory, use it.

An optional LEARNING_STATE.md exists only to compress decision-relevant capability state:

- mission;
- 1–3 Core targets;
- frontier;
- decisive evidence;
- durable misconceptions;
- understanding debt;
- delayed retrieval / transfer candidates;
- active source context.

A transcript records events. Learner state records their implications.

Do not create a parallel transcript store.

## 6. Learning Capabilities

AbleArc owns **routing**, not all implementations.

Retained capabilities include:

- Archify for structural visual representations;
- University Skill for substantial topic-first materials;
- youtube-render-pdf / bilibili-render-pdf for source-first lecture artifacts;
- skills-for-learning for learning-by-building;
- corpus-to-skill for reusable knowledge context from large stable corpora;
- research/search for verification and current information;
- code execution for experiments, runtime behavior, and debugging;
- document/PDF tooling for packaging material.

A capability should be invoked only when it is better than an inline answer.

The resulting artifact returns to normal learning/workflow use. It is not mastery evidence.

## 7. Host adapters

The detailed canonical policy remains:

    skills/ablearc/SKILL.md

Host-native adapters make AbleArc easy to use where a full Agent Skill is unavailable or unnecessary.

ChatGPT Project:

    adapters/chatgpt-project/PROJECT_INSTRUCTIONS.md

Generic system prompt:

    adapters/generic/SYSTEM_PROMPT.md

These adapters are product interfaces, not competing implementations.

## 8. Why this survives stronger models

As foundation models improve, explanation quality, scaffolding, and ordinary tutoring increasingly become baseline model capabilities.

AbleArc should not depend on having a longer tutoring prompt than the model.

Its durable problem is longitudinal:

- what reasoning should remain human-owned;
- when should AI interrupt its own execution advantage;
- what evidence shows capability growth;
- when should an old model be retrieved or transferred;
- where is understanding debt accumulating?

This makes AbleArc complementary to stronger models rather than threatened by them.

## 9. Architecture test

A new feature belongs in AbleArc core only when it materially improves at least one of:

1. longitudinal learner modeling;
2. learning-opportunity detection;
3. capability evidence / retrieval / transfer;
4. routing to a specialized Learning Capability;
5. preventing a repeated high-consequence learning failure.

Otherwise prefer the host, a prompt adapter, or an external capability.
