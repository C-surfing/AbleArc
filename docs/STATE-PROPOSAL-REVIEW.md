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
risk classification
    ├── low + eligible → runtime_policy reconcile
    └── medium / high → Workspace learner review
                         ↓
                  accept / reject + learner rationale
                         ↓
                 runtime.decide_state_proposal
    ↓
immutable StateDecision receipt
    ↓
accepted state projection (accept only)
```

The Workspace reads unresolved proposals through `tools/state_proposals.py`. That adapter calls the existing Runtime policy implementation; it does not duplicate transition or risk rules in TypeScript. The Web client may request `reconcile`, but Python decides which proposals are eligible and writes the resulting immutable state-decision receipts.

## Risk taxonomy

Risk is derived by the Runtime and is not stored as a new authority-bearing receipt field.

- **low** — only `unknown → exposed`, with no policy issues and a non-stale current state. This records evidence-bearing exposure, not mastery. It may be accepted automatically by `runtime_policy:low-risk-v0.1`.
- **medium** — ordinary evidence-backed transitions that make a stronger learner-state claim, such as `exposed → developing`. These remain explicit learner/human review.
- **high** — transitions to `stable` or `transferable`, downgrades, skipped states, or any proposal with conservative-policy issues. These remain explicit and policy-blocked cases still require learner/human override where allowed.

A stale proposal is never auto-accepted. Runtime policy cannot override its own safety checks. LearningMap topology is unaffected and remains proposal-first.

## Learner action

A review shows only the learner-relevant fields:

- concept;
- proposed before → after transition;
- proposal rationale;
- number of grounding Evidence receipts;
- proposer identity;
- current-state mismatch when the proposal is stale;
- Runtime risk level;
- Runtime policy issues when acceptance would require an override.

The learner must provide a rationale before accepting or rejecting. A rejection records a `state-decision` receipt but does not change state. A normal acceptance is allowed only when Runtime policy permits it and the proposal is not stale.

When Runtime policy reports issues, acceptance requires a separate explicit override acknowledgement. The resulting receipt records both the failed policy checks and `policy_overridden=true`. The client cannot manufacture a successful override: the Runtime independently re-checks the proposal and rejects unauthorized or stale transitions.

## Lifecycle and scope

Proposal review is Project-local. The API checks that the selected Project has not changed before submitting a decision. Runtime scope assignment then re-checks Workspace, Project, Mission, and lifecycle state.

Paused Projects remain read-only. Archived Projects remain read-only unless an explicit maintenance study is active. This is the same write boundary used by other Runtime receipts.

## What review does not mean

Accepting a proposal is an explicit learner-authority state decision, not new Evidence. The review action does not create Evidence, alter the LearningMap topology, satisfy the Mission Completion Gate, or schedule review. Policy override is visible provenance, not a shortcut that converts weak evidence into stronger evidence.
