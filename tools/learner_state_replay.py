#!/usr/bin/env python3
"""Read-only replay of accepted learner-state transitions.

This reader derives a compact learner-model history from immutable Runtime
state-proposal/state-decision receipts. It never writes Runtime state and never
uses chat text as history.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from tools import project_store
    from tools import runtime as learning_runtime
except ImportError:  # Direct execution
    import project_store
    import runtime as learning_runtime


class LearnerStateReplayError(RuntimeError):
    pass


def _context(repo_root: Path) -> project_store.ProjectContext:
    try:
        context = project_store.resolve_project_context(repo_root.resolve())
    except project_store.ProjectStoreError as exc:
        raise LearnerStateReplayError(str(exc)) from exc
    if context.layout != project_store.LAYOUT_WORKSPACE:
        raise LearnerStateReplayError("learner-state replay requires workspace-v0.2")
    return context


def _scope(context: project_store.ProjectContext, receipt: dict[str, Any], label: str) -> None:
    if receipt.get("project_id") != context.project_id:
        raise LearnerStateReplayError(f"{label} Project scope does not match the selected Project")
    if receipt.get("workspace_id") != context.workspace_id:
        raise LearnerStateReplayError(f"{label} Workspace scope does not match the selected Workspace")


def learner_state_replay(repo_root: Path, *, limit: int = 50) -> dict[str, Any]:
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1 or limit > 200:
        raise LearnerStateReplayError("limit must be an integer from 1 to 200")

    context = _context(repo_root)
    try:
        proposals = learning_runtime.list_receipts(repo_root, "state-proposal")
        decisions = learning_runtime.list_receipts(repo_root, "state-decision")
        turns = learning_runtime.list_receipts(repo_root, "turn")
        projected = learning_runtime.rebuild_state(repo_root)
    except learning_runtime.RuntimeContractError as exc:
        raise LearnerStateReplayError(f"learner-state replay integrity failed: {exc}") from exc

    proposal_by_id: dict[str, dict[str, Any]] = {}
    for proposal in proposals:
        _scope(context, proposal, "state proposal")
        proposal_id = str(proposal.get("id", ""))
        if not proposal_id:
            raise LearnerStateReplayError("state proposal is missing its id")
        proposal_by_id[proposal_id] = proposal

    turn_by_decision: dict[str, dict[str, Any]] = {}
    for turn in turns:
        _scope(context, turn, "turn")
        ids = turn.get("state_decision_ids", [])
        if not isinstance(ids, list):
            raise LearnerStateReplayError("turn state_decision_ids must be a list")
        for decision_id in ids:
            key = str(decision_id)
            if key in turn_by_decision:
                raise LearnerStateReplayError("one state decision cannot belong to multiple turns")
            turn_by_decision[key] = turn

    accepted: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for decision in decisions:
        _scope(context, decision, "state decision")
        if decision.get("decision") != "accepted":
            continue
        proposal_id = str(decision.get("proposal_id", ""))
        proposal = proposal_by_id.get(proposal_id)
        if proposal is None:
            raise LearnerStateReplayError("accepted state decision references a missing proposal")
        accepted.append((decision, proposal))

    accepted.sort(key=lambda pair: (str(pair[0].get("created_at", "")), str(pair[0].get("id", ""))))

    last_after: dict[str, str] = {}
    events: list[dict[str, Any]] = []
    for decision, proposal in accepted:
        concept_id = str(proposal.get("concept_id", ""))
        before = str(proposal.get("before", "unknown"))
        after = str(proposal.get("after", "unknown"))
        if not concept_id:
            raise LearnerStateReplayError("accepted proposal is missing concept_id")
        if concept_id in last_after and before != last_after[concept_id]:
            raise LearnerStateReplayError(
                f"learner-state replay is discontinuous for concept {concept_id}: "
                f"expected {last_after[concept_id]}, got {before}"
            )
        last_after[concept_id] = after

        authority = decision.get("authority")
        if not isinstance(authority, dict):
            raise LearnerStateReplayError("state decision authority must be an object")
        evidence_ids = proposal.get("evidence_ids", [])
        if not isinstance(evidence_ids, list):
            raise LearnerStateReplayError("state proposal evidence_ids must be a list")
        turn = turn_by_decision.get(str(decision.get("id", "")))
        events.append({
            "decision_id": str(decision.get("id", "")),
            "proposal_id": str(proposal.get("id", "")),
            "created_at": str(decision.get("created_at", "")),
            "concept_id": concept_id,
            "concept_label": str(proposal.get("concept_label", concept_id)),
            "before": before,
            "after": after,
            "reason": str(decision.get("reason", "")),
            "authority": {
                "type": str(authority.get("type", "unknown")),
                "id": str(authority.get("id", "unknown")),
            },
            "evidence_count": len(evidence_ids),
            "policy_overridden": decision.get("policy_overridden") is True,
            "turn": None if turn is None else {
                "id": str(turn.get("id", "")),
                "outcome": str(turn.get("outcome", "completed")),
                "summary": str(turn.get("summary", "Structured learning turn")),
            },
        })

    concepts = projected.get("concepts", {})
    if not isinstance(concepts, dict):
        raise LearnerStateReplayError("Runtime state projection concepts must be an object")
    for concept_id, state in concepts.items():
        if not isinstance(state, dict):
            raise LearnerStateReplayError("Runtime state projection contains an invalid concept")
        expected = last_after.get(str(concept_id))
        if expected is None:
            raise LearnerStateReplayError("Runtime state contains a concept without an accepted state decision")
        if str(state.get("state")) != expected:
            raise LearnerStateReplayError(
                f"replayed state for {concept_id} does not match Runtime projection"
            )
        last_decision = next(
            (event for event in reversed(events) if event["concept_id"] == concept_id),
            None,
        )
        if last_decision and state.get("decision_id") != last_decision["decision_id"]:
            raise LearnerStateReplayError(
                f"latest decision for {concept_id} does not match Runtime projection"
            )

    return {
        "project_id": context.project_id,
        "runtime_revision": projected.get("revision", 0),
        "events": list(reversed(events[-limit:])),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ai4learning learner-state replay reader")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    parser.add_argument("--limit", type=int, default=50)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        print(json.dumps(learner_state_replay(args.repo.resolve(), limit=args.limit), ensure_ascii=False, indent=2))
        return 0
    except (
        LearnerStateReplayError,
        learning_runtime.RuntimeContractError,
        project_store.ProjectStoreError,
        OSError,
    ) as exc:
        print(f"error: {exc}", file=__import__("sys").stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
