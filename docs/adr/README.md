# Architecture decision records

AbleArc's current architecture is Skill-first. ADR 0012 is the canonical product-boundary decision.

| ADR | Decision | Current role |
|---|---|---|
| [0003](0003-learning-map-topology-overlay.md) | Separate map topology from learner overlay | Historical design reference under audit |
| [0004](0004-cross-project-weak-priors.md) | Cross-project knowledge is a weak prior | Useful learner-model principle |
| [0005](0005-evidence-gated-mission-completion.md) | Completion requires meaningful evidence | Useful evidence principle; old Runtime mechanism under audit |
| [0006](0006-typed-learning-materials.md) | Materials are non-authoritative learning aids | Historical implementation reference; companion-Skill model now preferred |
| [0007](0007-learning-map-proposal-review.md) | Map revisions require care | Historical design reference under audit |
| [0009](0009-conversation-context-verification.md) | Use proportional verification | Useful interaction/tooling principle |
| [0010](0010-learning-kernel-boundary.md) | Prefer LLM judgment for contextual pedagogy | Important precursor to the Skill-first reset |
| [0012](0012-skill-first-reset.md) | AbleArc is a lightweight learning Skill | **Canonical** |

Superseded Web, Learning OS, and headless plugin ADRs have been removed from the current tree. Git history preserves them.

A historical ADR does not make its old subsystem canonical. New work should begin from ADR 0012 and docs/SKILL-FIRST-ARCHITECTURE.md.
