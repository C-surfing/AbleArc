#!/usr/bin/env python3
"""Headless learner review adapter for Runtime state proposals.

The adapter exposes pending proposal metadata and delegates all state mutation to
runtime.decide_state_proposal. It does not define a second transition policy.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from tools import runtime as learning_runtime
except ImportError:  # Direct execution: python tools/state_proposals.py
    import runtime as learning_runtime


class StateProposalReviewError(RuntimeError):
    pass


def pending_state_proposals(repo_root: Path) -> list[dict[str, Any]]:
    """Return unresolved proposals with Runtime-computed review metadata."""
    proposals = learning_runtime.list_receipts(repo_root, "state-proposal")
    decisions = learning_runtime.list_receipts(repo_root, "state-decision")
    decided = {str(item.get("proposal_id")) for item in decisions}
    state = learning_runtime.rebuild_state(repo_root)

    pending: list[dict[str, Any]] = []
    for proposal in proposals:
        proposal_id = str(proposal.get("id", ""))
        if not proposal_id or proposal_id in decided:
            continue
        concept_id = str(proposal.get("concept_id", ""))
        current = state.get("concepts", {}).get(concept_id)
        current_state = str(current.get("state")) if isinstance(current, dict) else "unknown"
        before = str(proposal.get("before", "unknown"))
        policy_issues = learning_runtime.transition_policy_issues(repo_root, proposal)
        risk = learning_runtime.state_transition_risk(repo_root, proposal)
        auto_accept_eligible = (
            not policy_issues
            and current_state == before
            and learning_runtime.low_risk_auto_accept_eligible(repo_root, proposal)
        )
        pending.append(
            {
                "id": proposal_id,
                "project_id": proposal.get("project_id"),
                "mission_id": proposal.get("mission_id"),
                "concept_id": concept_id,
                "concept_label": str(proposal.get("concept_label", concept_id or "Concept")),
                "before": before,
                "after": str(proposal.get("after", "unknown")),
                "current_state": current_state,
                "rationale": str(proposal.get("rationale", "")),
                "proposed_by": str(proposal.get("proposed_by", "unknown")),
                "evidence_count": len(proposal.get("evidence_ids", []))
                if isinstance(proposal.get("evidence_ids"), list)
                else 0,
                "policy_issues": policy_issues,
                "risk": risk,
                "auto_accept_eligible": auto_accept_eligible,
                "stale": current_state != before,
                "created_at": str(proposal.get("created_at", "")),
            }
        )

    pending.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
    return pending


def decide_state_proposal(
    repo_root: Path,
    proposal_id: str,
    decision: str,
    reason: str,
    *,
    override_policy: bool = False,
) -> dict[str, Any]:
    """Record one explicit local learner decision through the Runtime authority path."""
    return learning_runtime.decide_state_proposal(
        repo_root,
        proposal_id,
        decision,
        "learner",
        "workspace-learner",
        reason,
        override_policy=override_policy,
    )


def reconcile_low_risk_state_proposals(repo_root: Path) -> list[dict[str, Any]]:
    """Delegate low-risk reconciliation to the canonical Runtime policy."""
    return learning_runtime.reconcile_low_risk_state_proposals(repo_root)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ai4learning learner state-proposal review adapter")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list", help="list unresolved state proposals with policy status")
    sub.add_parser("reconcile", help="auto-accept eligible low-risk proposals through Runtime policy")
    decide = sub.add_parser("decide", help="accept or reject one proposal as the local learner")
    decide.add_argument("proposal_id")
    decide.add_argument("decision", choices=("accepted", "rejected"))
    decide.add_argument("reason")
    decide.add_argument("--override-policy", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    repo_root = args.repo.resolve()
    try:
        if args.command == "list":
            print(json.dumps({"proposals": pending_state_proposals(repo_root)}, ensure_ascii=False, indent=2))
            return 0
        if args.command == "reconcile":
            decisions = reconcile_low_risk_state_proposals(repo_root)
            print(json.dumps({"decisions": decisions}, ensure_ascii=False, indent=2))
            return 0
        if args.command == "decide":
            result = decide_state_proposal(
                repo_root,
                args.proposal_id,
                args.decision,
                args.reason,
                override_policy=args.override_policy,
            )
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
    except (OSError, learning_runtime.RuntimeContractError, StateProposalReviewError) as exc:
        print(f"error: {exc}", file=__import__("sys").stderr)
        return 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
