# Architecture decision records

These records freeze the product and runtime boundaries that later schema and
storage migrations must preserve. They describe decisions, not an
implementation backlog; delivery sequencing remains in the project roadmap.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-product-runtime-boundary.md) | One provider-neutral runtime, two product entry points | Accepted |
| [0002](0002-workspace-project-mission-scope.md) | Workspace learner memory and project-local learning state | Accepted |
| [0003](0003-learning-map-topology-overlay.md) | Separate map topology from the accepted learner overlay | Accepted |
| [0004](0004-cross-project-weak-priors.md) | Cross-project knowledge is a weak prior, never mastery evidence | Accepted |
| [0005](0005-evidence-gated-mission-completion.md) | Mission completion requires distinct Feynman and performance Evidence | Accepted |
| [0006](0006-typed-learning-materials.md) | Saved LearningMaterials are typed, provenance-aware, and non-authoritative | Accepted |
| [0007](0007-learning-map-proposal-review.md) | LearningMap topology proposals require explicit learner review before canonical revision | Accepted |
| [0008](0008-learning-os-product-boundary.md) | Promote the first-party product to a Learning OS while preserving Runtime authority and separating learning truth, context, learner-owned records, and operational state | Accepted |
| [0009](0009-conversation-context-verification.md) | Separate conversation, learning-control, and capability planes; use proportional verification | Accepted |
| [0010](0010-learning-kernel-boundary.md) | Define the Learning Kernel boundary; prefer LLM judgment for contextual pedagogy and deterministic code for learner-truth invariants | Accepted |

## Compatibility rule

Accepted ADRs may be superseded by a later numbered record, but their data
compatibility consequences remain binding until an explicit, tested migration
exists. In particular, the unscoped v0.1 `.learning/` layout and receipt ledger
must remain readable while the project evolves toward workspace/project scope.

ADR 0008 extends ADR 0001 rather than removing its provider/runtime boundary:
the first-party Workspace may become the full reference Learning OS, but all
learner-truth changes still pass through Runtime authority.

ADR 0010 changes current delivery priority, not the authority model established by ADRs 0001–0009. Product surfaces remain Hosts over the same learner-truth boundary while Kernel v1 is consolidated and frozen.
