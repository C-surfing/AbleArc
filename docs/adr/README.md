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

## Compatibility rule

Accepted ADRs may be superseded by a later numbered record, but their data
compatibility consequences remain binding until an explicit, tested migration
exists. In particular, the unscoped v0.1 `.learning/` layout and receipt ledger
must remain readable while the project evolves toward workspace/project scope.
