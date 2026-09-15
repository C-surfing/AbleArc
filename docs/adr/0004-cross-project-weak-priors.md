# ADR 0004: Cross-project knowledge is a weak prior

- Status: Accepted
- Date: 2026-09-15

## Context

Complete project isolation wastes relevant prior learning, but copying a
`stable` or `transferable` state into a new project would bypass evidence
authority. Concept labels can also hide important differences in task form,
context, and required independence.

## Decision

Evidence accepted in another project may be exposed to an agent only as a
`PriorCandidate`. It can justify a cheaper or more discriminative probe, but it
cannot establish project-local mastery.

```text
source-project evidence
        ↓
weak prior
        ↓
target-project probe
        ↓
target-project observation and evidence
        ↓
target-project accepted state
```

The first implementation uses only exact concept IDs, explicitly declared
aliases, or a learner/agent-confirmed association. Automatic ontology merging
or embedding-based state transfer is out of scope.

## Invariants

- A `PriorCandidate` is not an EvidenceReceipt in the target project.
- Source-project evidence IDs cannot appear directly in a target-project state
  proposal.
- With no target-project evidence, a historical `stable` state cannot promote
  the target-project concept.
- The agent tells the runtime which historical relation it is testing; failure
  remains informative target-project evidence rather than corrupting history.
- Weak priors include source project, concept, decisive evidence summary, last
  verification time, and relevance rationale.

## Consequences

- Project-aware receipt validation must reject cross-project references.
- The UI and agent handoff may show prior candidates, but must label them as
  unverified in the current project.
- Real learner research must test whether weak priors save time or create
  harmful anchoring before matching becomes more automatic.

