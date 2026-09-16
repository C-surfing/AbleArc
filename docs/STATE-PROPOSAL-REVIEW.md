# Learner State Proposal Review

The Workspace may let the learner review a pending evidence-grounded `StateProposal`, but the review surface does not become learner-state authority by itself. The Runtime remains the only component that can write an accepted `state-decision` receipt and update the rebuildable state projection.

## Flow

```text
Agent / assessor
    ↓
StateProposal + Evidence references
    ↓
Runtime transition-policy inspection
    ↓
Workspace learner review
    ↓
accept / reject + learner rationale
    ↓
runtime.decide_state_proposal
    ↓
immutable StateDecision receipt
    ↓
accepted state projection (accept only)
```

The Workspace reads unresolved proposals through `tools/state_proposals.py`. That adapter calls the existing Runtime policy implementation; it does not duplicate transition rules in TypeScript.

## Learner action

A review shows only the learner-relevant fields:

- concept;
- proposed before → after transition;
- proposal rationale;
- number of grounding Evidence receipts;
- proposer identity;
- current-state mismatch when the proposal is stale;
- Runtime policy issues when acceptance would require an override.

The learner must provide a rationale before accepting or rejecting. A rejection records a `state-decision` receipt but does not change state. A normal acceptance is allowed only when Runtime policy permits it and the proposal is not stale.

When Runtime policy reports issues, acceptance requires a separate explicit override acknowledgement. The resulting receipt records both the failed policy checks and `policy_overridden=true`. The client cannot manufacture a successful override: the Runtime independently re-checks the proposal and rejects unauthorized or stale transitions.

## Lifecycle and scope

Proposal review is Project-local. The API checks that the selected Project has not changed before submitting a decision. Runtime scope assignment then re-checks Workspace, Project, Mission, and lifecycle state.

Paused Projects remain read-only. Archived Projects remain read-only unless an explicit maintenance study is active. This is the same write boundary used by other Runtime receipts.

## What review does not mean

Accepting a proposal is an explicit learner-authority state decision, not new Evidence. The review action does not create Evidence, alter the LearningMap topology, satisfy the Mission Completion Gate, or schedule review. Policy override is visible provenance, not a shortcut that converts weak evidence into stronger evidence.
