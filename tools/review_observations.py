#!/usr/bin/env python3
"""Export descriptive delayed-retrieval observations for longitudinal dogfooding.

The report is intentionally non-prescriptive. It exposes what state the learner
was in when delayed Evidence was observed and what the Runtime later accepted,
without assigning review priority or scheduling an intervention.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from tools import project_store
    from tools import runtime as learning_runtime
except ImportError:  # Direct execution
    import project_store
    import runtime as learning_runtime


class ReviewObservationError(RuntimeError):
    pass


def _context(repo_root: Path) -> project_store.ProjectContext:
    try:
        context = project_store.resolve_project_context(repo_root.resolve())
    except project_store.ProjectStoreError as exc:
        raise ReviewObservationError(str(exc)) from exc
    if context.layout != project_store.LAYOUT_WORKSPACE:
        raise ReviewObservationError("review observations require workspace-v0.2")
    return context


def _scope(context: project_store.ProjectContext, receipt: dict[str, Any], label: str) -> None:
    if receipt.get("project_id") != context.project_id:
        raise ReviewObservationError(f"{label} Project scope does not match the selected Project")
    if receipt.get("workspace_id") != context.workspace_id:
        raise ReviewObservationError(f"{label} Workspace scope does not match the selected Workspace")


def _timestamp(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ReviewObservationError(f"{label} must be an ISO-8601 timestamp")
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise ReviewObservationError(f"{label} must be an ISO-8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise ReviewObservationError(f"{label} must include a timezone")
    return parsed.astimezone(timezone.utc)


def review_observations(repo_root: Path, *, limit: int = 200) -> dict[str, Any]:
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1 or limit > 1000:
        raise ReviewObservationError("limit must be an integer from 1 to 1000")

    context = _context(repo_root)
    try:
        evidence = learning_runtime.list_receipts(repo_root, "evidence")
        proposals = learning_runtime.list_receipts(repo_root, "state-proposal")
        decisions = learning_runtime.list_receipts(repo_root, "state-decision")
        turns = learning_runtime.list_receipts(repo_root, "turn")
        projected = learning_runtime.rebuild_state(repo_root)
    except learning_runtime.RuntimeContractError as exc:
        raise ReviewObservationError(f"review observation integrity failed: {exc}") from exc

    for item in evidence:
        _scope(context, item, "evidence")
    for item in proposals:
        _scope(context, item, "state proposal")
    for item in decisions:
        _scope(context, item, "state decision")
    for item in turns:
        _scope(context, item, "turn")

    proposal_by_id = {str(item.get("id", "")): item for item in proposals}
    accepted: list[tuple[datetime, dict[str, Any], dict[str, Any]]] = []
    concept_labels: dict[str, str] = {}
    accepted_by_evidence: dict[tuple[str, str], list[dict[str, Any]]] = {}

    for decision in decisions:
        if decision.get("decision") != "accepted":
            continue
        proposal_id = str(decision.get("proposal_id", ""))
        proposal = proposal_by_id.get(proposal_id)
        if proposal is None:
            raise ReviewObservationError("accepted state decision references a missing proposal")
        concept_id = str(proposal.get("concept_id", ""))
        if not concept_id:
            raise ReviewObservationError("accepted state proposal is missing concept_id")
        concept_labels[concept_id] = str(proposal.get("concept_label", concept_id))
        decision_at = _timestamp(decision.get("created_at"), "state decision created_at")
        accepted.append((decision_at, decision, proposal))
        evidence_ids = proposal.get("evidence_ids", [])
        if not isinstance(evidence_ids, list):
            raise ReviewObservationError("state proposal evidence_ids must be a list")
        for evidence_id in evidence_ids:
            key = (str(evidence_id), concept_id)
            accepted_by_evidence.setdefault(key, []).append({
                "decision_id": str(decision.get("id", "")),
                "created_at": str(decision.get("created_at", "")),
                "before": str(proposal.get("before", "unknown")),
                "after": str(proposal.get("after", "unknown")),
                "policy_overridden": decision.get("policy_overridden") is True,
            })

    accepted.sort(key=lambda item: (item[0], str(item[1].get("id", ""))))

    turn_by_evidence: dict[str, dict[str, Any]] = {}
    for turn in turns:
        evidence_ids = turn.get("evidence_ids", [])
        if not isinstance(evidence_ids, list):
            raise ReviewObservationError("turn evidence_ids must be a list")
        for evidence_id in evidence_ids:
            key = str(evidence_id)
            if key in turn_by_evidence:
                raise ReviewObservationError("one Evidence receipt cannot belong to multiple Turns")
            turn_by_evidence[key] = turn

    observations: list[tuple[datetime, dict[str, Any]]] = []
    for item in evidence:
        if item.get("delay") != "delayed":
            continue
        evidence_id = str(item.get("id", ""))
        evidence_at = _timestamp(item.get("created_at"), "evidence created_at")
        concept_ids = item.get("concept_ids", [])
        if not isinstance(concept_ids, list) or not concept_ids:
            raise ReviewObservationError("delayed Evidence must reference at least one concept")
        turn = turn_by_evidence.get(evidence_id)

        for raw_concept_id in concept_ids:
            concept_id = str(raw_concept_id)
            state_before = "unknown"
            state_changed_at: str | None = None
            prior_decision_id: str | None = None
            label = concept_labels.get(concept_id, concept_id)

            for decision_at, decision, proposal in accepted:
                if decision_at >= evidence_at:
                    break
                if str(proposal.get("concept_id", "")) != concept_id:
                    continue
                state_before = str(proposal.get("after", "unknown"))
                state_changed_at = str(decision.get("created_at", ""))
                prior_decision_id = str(decision.get("id", ""))
                label = str(proposal.get("concept_label", label))

            observations.append((evidence_at, {
                "evidence_id": evidence_id,
                "observed_at": str(item.get("created_at", "")),
                "concept_id": concept_id,
                "concept_label": label,
                "state_before": state_before,
                "state_changed_at": state_changed_at,
                "prior_state_decision_id": prior_decision_id,
                "level": str(item.get("level", "")),
                "outcome": str(item.get("outcome", "")),
                "scaffolding": str(item.get("scaffolding", "")),
                "context": str(item.get("context", "")),
                "independence": str(item.get("independence", "")),
                "result_summary": str(item.get("result_summary", "")),
                "turn": None if turn is None else {
                    "id": str(turn.get("id", "")),
                    "outcome": str(turn.get("outcome", "completed")),
                    "summary": str(turn.get("summary", "Structured learning turn")),
                },
                "accepted_transitions_using_evidence": accepted_by_evidence.get((evidence_id, concept_id), []),
            }))

    observations.sort(key=lambda item: (item[0], item[1]["evidence_id"], item[1]["concept_id"]), reverse=True)
    return {
        "project_id": context.project_id,
        "runtime_revision": projected.get("revision", 0),
        "observation_count": len(observations),
        "observations": [item for _, item in observations[:limit]],
        "interpretation": "descriptive_only_no_review_priority",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="export delayed-retrieval observations for dogfooding")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    parser.add_argument("--limit", type=int, default=200)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        value = review_observations(args.repo.resolve(), limit=args.limit)
        print(json.dumps(value, ensure_ascii=False, indent=2))
        return 0
    except (ReviewObservationError, project_store.ProjectStoreError, OSError) as exc:
        print(f"error: {exc}", file=__import__("sys").stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
