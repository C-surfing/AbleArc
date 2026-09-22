# ADR 0011 — Headless ChatGPT plugin host

Status: **accepted**  
Date: 2026-09-22

## Context

AbleArc already has a provider-neutral Learning Kernel, structured Runtime authority, Teach/Study skills, and a thin assistant-host boundary.

First-party Web work proved useful for product dogfooding, but it also consumed substantial development effort without resolving the active K8 question: does the Kernel help a real learner become more capable across sessions?

ChatGPT already provides the conversation plane, language model, attachment handling, and natural interaction surface. Calling another Provider model from an AbleArc plugin would duplicate reasoning, increase latency/cost, and create two competing teaching judgments.

OpenAI plugins can combine Skills and MCP tools without custom UI.

## Decision

The next primary AbleArc host is a **headless ChatGPT plugin**.

```text
ChatGPT = Teacher / conversation plane
        ↓
AbleArc Skill = teaching workflow / policy
        ↓
AbleArc MCP = controlled Kernel operations
        ↓
Learning Kernel
        ↓
Runtime = learner-truth authority
```

### ChatGPT owns contextual teaching judgment

ChatGPT decides, guided by the AbleArc Skill:

- whether to answer, explain, probe, retrieve, contrast, repair, apply, or transfer;
- how much scaffolding to reveal;
- how to diagnose a learner failure;
- how to phrase feedback;
- which single next cognitive move is most useful.

### MCP exposes a small control surface

The initial surface is limited to:

- `inspect_learning`;
- `start_or_resume_learning`;
- `record_learner_action`;
- `commit_learning_turn`.

Raw Runtime commands are not exposed as plugin tools.

### No second Provider model

The ChatGPT plugin path must not call `AgentAdapter.generateStructured` for teaching assessment.

ChatGPT supplies the structured teaching judgment directly. AbleArc validates it and commits through Runtime.

The Web Provider adapter remains a separate Host implementation; it is not part of the plugin path.

### Runtime remains authoritative

The plugin may propose an assessment and next move. It does not directly:

- promote mastery;
- accept its own state proposal;
- redefine Mission;
- mutate LearningMap topology outside the canonical proposal/authority path;
- claim Completion.

### Conversation history is not learner truth

ChatGPT may retain its own conversation history.

AbleArc persists only learning-relevant state through existing contracts:

- Observation;
- Evidence;
- accepted learner state;
- Mission/Project lifecycle;
- reviewed LearningMap state;
- deliberate LearningMaterial;
- durable Learner Profile context.

The plugin does not mirror the ChatGPT transcript into `.learning/`.

### No custom UI in this phase

ChatGPT itself is the learner-facing interface.

Custom plugin UI is deferred until a real learning failure requires it.

## Consequences

### Positive

- K8 longitudinal dogfooding can happen in the interface the learner already uses daily.
- Teaching voice stays coherent because one model is the Teacher.
- Kernel authority is tested independently from first-party Web UX.
- Plugin behavior can improve mainly through Skill/policy changes without adding deterministic Kernel machinery.
- Local-first learner state remains viable through a private MCP server and Secure MCP Tunnel.

### Costs

- The Skill must be explicit enough that ChatGPT reliably separates ordinary conversation from learner actions.
- Tool calls need stable internal identifiers while keeping those identifiers out of learner-facing prose.
- Public plugin distribution eventually requires a stable HTTPS MCP endpoint and production authentication.
- ChatGPT-host behavior must be dogfooded independently from Web-host behavior.

## Rejected alternatives

### Embed the AbleArc Web UI inside ChatGPT

Rejected for v0.1. It duplicates a learner-facing surface and does not improve Kernel validation.

### Call AbleArc's Provider model behind ChatGPT

Rejected. It creates a model-behind-model architecture with extra latency, cost, and inconsistent teaching judgment.

### Expose every Runtime operation as an MCP tool

Rejected. The host should operate through a small semantic control surface, not ledger mechanics.

### Move teaching policy into deterministic code

Rejected. Contextual pedagogy remains LLM judgment unless real longitudinal failures prove that an invariant is needed.

## Validation

This ADR is validated through the active K8 gate:

1. real multi-session learning;
2. delayed retrieval without replaying the explanation;
3. application/transfer in changed contexts;
4. preserved independence/scaffolding information;
5. failure classification before Kernel changes.

A new first-class Kernel abstraction still requires evidence of a repeated structural learning failure.
