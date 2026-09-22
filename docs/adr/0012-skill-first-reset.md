# ADR 0012 — Reset AbleArc to a lightweight learning Skill

Status: **Accepted**  
Date: **2026-09-22**

## Context

AbleArc evolved from a teaching Skill into a broader Learning OS architecture with a Web workspace, deterministic Runtime authority, typed receipts, a material subsystem, an MCP host, and a ChatGPT plugin package.

That work clarified several durable principles, especially evidence-grounded learner modeling and the boundary between contextual teaching judgment and deterministic invariants.

However, the product path became heavier than the daily learning problem requires. Installation and operation increasingly depended on infrastructure that was not itself responsible for the core learner value.

The desired experience is now explicit:

- open an existing AI assistant;
- invoke one lightweight learning Skill;
- have the model teach naturally;
- preserve only useful learner context;
- call specialized skills such as Archify or University Skill when they improve the learning move;
- avoid maintaining a separate first-party product surface.

## Decision

AbleArc becomes a **Skill-first learning orchestrator**.

The canonical implementation is skills/ablearc/SKILL.md.

The first-class learning model is reduced to Goal, Learner Model, Frontier, and Move.

Evidence remains a teaching principle, not a mandatory transaction chain for every meaningful turn.

Persistence becomes optional and compact.

Web, MCP, plugin, provider, runtime-ledger, and material-generation infrastructure are no longer canonical dependencies.

Specialized artifact generation should preferentially be delegated to optional companion skills rather than reimplemented inside AbleArc.

Initial companions:

- Archify — visual mechanisms, workflows, maps, state/lifecycle diagrams;
- University Skill — substantial topic-first textbook/coursebook artifacts;
- wdkns video render skills — source-first YouTube/Bilibili lecture notes and PDFs;
- research/search — source verification and current information;
- code execution — only when execution has learning value.

## Consequences

### Positive

- installation becomes dramatically simpler;
- the default experience becomes conversation-native;
- teaching instructions can become much shorter;
- AbleArc can benefit from the growing Agent Skill ecosystem;
- specialized projects can improve independently;
- the project can dogfood learning behavior without debugging a UI/product stack.

### Negative

- deterministic replay and auditability are reduced in the default path;
- hosts without durable memory may lose cross-session state;
- companion-skill availability differs across environments;
- some existing Runtime/Web/MCP work becomes non-canonical and will be removed or archived.

These trade-offs are accepted because the primary product goal is effective everyday learning, not exhaustive protocol instrumentation.

## Migration

1. Add the canonical skills/ablearc Skill.
2. Rewrite README and roadmap around Skill-first use.
3. Retain old Teach/Study/Runtime/Web code temporarily for migration reference.
4. Dogfood the new Skill directly.
5. Remove superseded product infrastructure in a dedicated cleanup phase.
6. Keep only deterministic utilities that continue to solve demonstrated learning problems.

## Supersedes

This ADR supersedes the host/product direction portions of prior architecture documents, including the 2026-09-22 MCP/ChatGPT-plugin host shift.

Earlier work remains historical context, but it is not the default product architecture after this decision.
