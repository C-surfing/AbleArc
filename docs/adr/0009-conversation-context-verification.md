# ADR 0009 — Conversation Plane, Context Inputs, and Proportional Verification

Status: Accepted  
Date: 2026-09-18

## Context

Real Agent-mode dogfooding on 2026-09-18 showed that AbleArc's internal teaching protocol is more mature than its learner-facing conversation boundary. The current system can record Decision, Observation, Evidence, state, and map artifacts, but parts of that control vocabulary leak directly into the interaction. Technical teaching also tends to prefer executable experiments even when direct reasoning would be sufficient.

The same session showed that learner-supplied references and explicit self-report are valuable inputs but are not represented as first-class routing context.

## Decision

This ADR supersedes the Capture-specific product assumption in ADR 0008 and the original vNext roadmap. **Capture Inbox is not promoted as a product subsystem.** Transient learner thoughts, constraints, and references should enter through the current host conversation by default; a future specialized interaction requires new behavioral evidence.

AbleArc adopts three separable planes:

1. **Conversation Plane** — learner-facing natural interaction, including messages, attachments/references, and explicit self-report.
2. **Learning-Control Plane** — Mission, Decision, Observation, Evidence, learner-state, map, authority, and completion semantics.
3. **Capability / Verification Plane** — retrieval, source verification, execution, visualization, and other tool-backed workflows.

The Learning-Control Plane remains authoritative for learner truth. The Conversation Plane may present or collect information without turning every message into Evidence. Capability use is subordinate to a selected learning need and does not become authority.

### Presentation/control separation

A host-facing teaching response must be able to carry both:

- a natural learner-facing presentation; and
- an internal structured control proposal.

The presentation must not be reconstructed mechanically from receipt labels such as `supports`, `contradicts`, confidence, expected evidence, or falsification signal. Those fields may be inspectable, but they are not the default teaching UI.

### Learner self-report

Explicit learner statements about prior knowledge, uncertainty, preferences, constraints, or desired mode are accepted as contextual hypotheses. They may change routing immediately when doing so is low-risk. They do not directly establish stable or transferable mastery.

### Learner-provided references

Files, snippets, links, course materials, papers, code, and named resources may be attached to a turn or Project as reference context. They may shape order, terminology, examples, and factual grounding.

Reference context is distinct from Runtime Evidence and LearningMaterial. A learner-supplied source is not automatically authoritative.

### Proportional verification

AbleArc uses the cheapest verification action sufficient for the teaching decision:

- reason/explain without tools when the relevant claim is stable and the model can justify it directly;
- retrieve/check sources for current, source-specific, quoted, standard/API, or uncertain claims;
- execute/test when concrete runtime behavior, learner code, environment effects, or otherwise unresolved correctness materially affects the next decision.

A tool call should have explicit decision value: there must be a material uncertainty it can resolve.

### Host integration

AbleArc treats the first-party Web app, external Agents, and future ChatGPT/assistant integrations as hosts over the same Learning Engine. A host may own presentation and conversation transport; it may not silently become a second mastery authority.

## Consequences

- The Web orchestrator must evolve from one combined structured assessment/next-move object toward separate presentation and control outputs.
- Current UI protocol labels should be hidden or moved to an explicit inspection surface.
- Teach/Study prompts must accept useful self-report and learner references without forcing redundant probes.
- Tool use becomes policy-governed by verification value rather than domain alone.
- A host-neutral integration contract is required before building multiple product-specific plugins.
- The canonical product information architecture no longer reserves a Capture Inbox surface.
- Runtime v0.3 design should make negative/ambiguous evidence, failure modes, artifact form, and frontier revision representable without weakening mastery authority.

## Non-goals

This ADR does not:

- make self-report mastery Evidence;
- allow source attachments to promote mastery;
- remove Runtime receipts or authority;
- require every host to expose the same UI;
- introduce a general RAG platform;
- require code execution for programming education;
- make a model Provider authoritative.
