#!/usr/bin/env python3
"""Immutable proposal/review boundary for LearningMap topology revisions.

A proposal is not a map revision. It freezes one evidence-grounded candidate
against a base revision so a learner can inspect and explicitly accept or reject
it. Acceptance reuses the canonical LearningMap validators and writer while
holding the same map lock; rejection never mutates topology.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

try:
    from tools import learning_map, project_store
except ImportError:  # Direct execution: python tools/learning_map_proposals.py
    import learning_map
    import project_store


SCHEMA_VERSION = "0.1"
PROPOSAL_ID = re.compile(r"^mp_[A-Za-z0-9_-]{4,124}$")
DECISION_ID = re.compile(r"^mpd_[A-Za-z0-9_-]{4,123}$")


class LearningMapProposalError(RuntimeError):
    pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _text(value: Any, label: str, maximum: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise LearningMapProposalError(
            f"{label} must be a non-empty string of at most {maximum} characters"
        )
    return value.strip()


def _resolve_context(repo_root: Path) -> project_store.ProjectContext:
    context = project_store.resolve_project_context(repo_root.resolve())
    if (
        context.layout != project_store.LAYOUT_WORKSPACE
        or context.learning_map_path is None
        or context.mission_id is None
    ):
        raise LearningMapProposalError(
            "LearningMap proposal review requires a selected workspace-v0.2 Project and Mission"
        )
    return context


def _proposal_root(context: project_store.ProjectContext) -> Path:
    assert context.learning_map_path is not None
    return context.learning_map_path.parent / "proposals"


def _decision_root(context: project_store.ProjectContext) -> Path:
    assert context.learning_map_path is not None
    return context.learning_map_path.parent / "proposal-decisions"


def _read_object(path: Path, label: str) -> dict[str, Any]:
    if path.is_symlink():
        raise LearningMapProposalError(f"{label} must not be a symbolic link")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise LearningMapProposalError(f"cannot read {label}: {path}") from exc
    except json.JSONDecodeError as exc:
        raise LearningMapProposalError(f"invalid JSON in {label}: {path}") from exc
    if not isinstance(value, dict):
        raise LearningMapProposalError(f"{label} must be a JSON object")
    return value


def _write_new(path: Path, value: dict[str, Any], label: str) -> None:
    if path.parent.is_symlink():
        raise LearningMapProposalError(f"{label} directory must not be a symbolic link")
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("x", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
    except FileExistsError as exc:
        raise LearningMapProposalError(f"{label} already exists: {path.name}") from exc


@contextmanager
def _decision_lock(context: project_store.ProjectContext, proposal_id: str) -> Iterator[None]:
    root = _decision_root(context)
    if root.is_symlink():
        raise LearningMapProposalError("LearningMap proposal decision directory must not be a symbolic link")
    root.mkdir(parents=True, exist_ok=True)
    lock = root / f".{proposal_id}.lock"
    try:
        handle = lock.open("x", encoding="utf-8")
    except FileExistsError as exc:
        raise LearningMapProposalError("another decision for this LearningMap proposal is in progress") from exc
    try:
        handle.write(f"pid={os.getpid()}\n")
        handle.close()
        yield
    finally:
        lock.unlink(missing_ok=True)


def _map_payload(value: dict[str, Any]) -> dict[str, Any]:
    return {
        "rationale": value["rationale"],
        "evidence_ids": value["evidence_ids"],
        "frontier": value["frontier"],
        "nodes": value["nodes"],
        "edges": value["edges"],
    }


def _prepare_map_value(
    context: project_store.ProjectContext,
    current: dict[str, Any],
    payload: Any,
) -> dict[str, Any]:
    """Apply the exact canonical LearningMap validation semantics without writing."""
    if not isinstance(payload, dict):
        raise LearningMapProposalError("LearningMap proposal payload must be a JSON object")
    try:
        learning_map._exact_keys(
            payload,
            {"nodes", "edges", "frontier", "rationale", "evidence_ids"},
            "LearningMap proposal",
        )
        nodes = learning_map._nodes(payload["nodes"])
        if not nodes:
            raise learning_map.LearningMapError(
                "an evidence-grounded LearningMap proposal must contain nodes"
            )
        node_ids = {item["id"] for item in nodes}
        edges = learning_map._edges(payload["edges"], node_ids)
        frontier = learning_map._unique_ids(payload["frontier"], "frontier", 12)
        if not frontier or any(item not in node_ids for item in frontier):
            raise learning_map.LearningMapError(
                "a proposed LearningMap needs a valid current frontier"
            )
        evidence_ids = learning_map._evidence_ids(payload["evidence_ids"])
        if not evidence_ids:
            raise learning_map.LearningMapError(
                "LearningMap proposals require project-local evidence"
            )
        learning_map._assert_evidence(context, evidence_ids)
        added_nodes, removed_nodes, changed_nodes = learning_map._changes(
            current["nodes"], nodes
        )
        added_edges, removed_edges, changed_edges = learning_map._changes(
            current["edges"], edges
        )
        frontier_changed = current["frontier"] != frontier
        if not any(
            (
                added_nodes,
                removed_nodes,
                changed_nodes,
                added_edges,
                removed_edges,
                changed_edges,
                frontier_changed,
            )
        ):
            raise learning_map.LearningMapError(
                "LearningMap proposal does not change topology or frontier"
            )
        timestamp = learning_map._now()
        candidate = {
            "schema_version": learning_map.SCHEMA_VERSION,
            "kind": "learning-map",
            "project_id": context.project_id,
            "revision": current["revision"] + 1,
            "parent_revision": current["revision"],
            "created_at": current["created_at"],
            "updated_at": timestamp,
            "rationale": learning_map._text(payload["rationale"], "rationale", 1600),
            "evidence_ids": evidence_ids,
            "frontier": frontier,
            "nodes": nodes,
            "edges": edges,
            "delta": {
                "added_node_ids": added_nodes,
                "removed_node_ids": removed_nodes,
                "changed_node_ids": changed_nodes,
                "added_edge_ids": added_edges,
                "removed_edge_ids": removed_edges,
                "changed_edge_ids": changed_edges,
                "frontier_changed": frontier_changed,
            },
        }
        return learning_map.validate_learning_map(candidate, context.project_id)
    except learning_map.LearningMapError as exc:
        raise LearningMapProposalError(str(exc)) from exc


def validate_proposal(value: Any, context: project_store.ProjectContext) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise LearningMapProposalError("LearningMap proposal must be a JSON object")
    fields = {
        "schema_version", "kind", "id", "workspace_id", "project_id", "mission_id",
        "base_revision", "created_at", "proposed_by", "rationale", "evidence_ids",
        "frontier", "nodes", "edges", "delta",
    }
    if set(value) != fields:
        raise LearningMapProposalError("LearningMap proposal fields are invalid")
    proposal_id = value["id"]
    if not isinstance(proposal_id, str) or not PROPOSAL_ID.fullmatch(proposal_id):
        raise LearningMapProposalError("LearningMap proposal id is invalid")
    if value["schema_version"] != SCHEMA_VERSION or value["kind"] != "learning-map-proposal":
        raise LearningMapProposalError("unsupported LearningMap proposal schema")
    if value["workspace_id"] != context.workspace_id or value["project_id"] != context.project_id:
        raise LearningMapProposalError("LearningMap proposal scope does not match the selected Project")
    mission_id = value["mission_id"]
    if not isinstance(mission_id, str) or not mission_id:
        raise LearningMapProposalError("LearningMap proposal mission_id is invalid")
    base_revision = value["base_revision"]
    if isinstance(base_revision, bool) or not isinstance(base_revision, int) or base_revision < 0:
        raise LearningMapProposalError("LearningMap proposal base_revision is invalid")
    try:
        nodes = learning_map._nodes(value["nodes"])
        node_ids = {item["id"] for item in nodes}
        edges = learning_map._edges(value["edges"], node_ids)
        frontier = learning_map._unique_ids(value["frontier"], "frontier", 12)
        if not frontier or any(item not in node_ids for item in frontier):
            raise learning_map.LearningMapError("LearningMap proposal frontier is invalid")
        evidence_ids = learning_map._evidence_ids(value["evidence_ids"])
        if not evidence_ids:
            raise learning_map.LearningMapError("LearningMap proposal requires evidence")
        delta = learning_map._delta(value["delta"])
    except learning_map.LearningMapError as exc:
        raise LearningMapProposalError(str(exc)) from exc
    return {
        "schema_version": SCHEMA_VERSION,
        "kind": "learning-map-proposal",
        "id": proposal_id,
        "workspace_id": value["workspace_id"],
        "project_id": value["project_id"],
        "mission_id": mission_id,
        "base_revision": base_revision,
        "created_at": _text(value["created_at"], "created_at", 100),
        "proposed_by": _text(value["proposed_by"], "proposed_by", 200),
        "rationale": _text(value["rationale"], "rationale", 1600),
        "evidence_ids": evidence_ids,
        "frontier": frontier,
        "nodes": nodes,
        "edges": edges,
        "delta": delta,
    }


def _proposal_semantics(value: dict[str, Any]) -> dict[str, Any]:
    return {key: value[key] for key in (
        "workspace_id", "project_id", "mission_id", "base_revision", "proposed_by",
        "rationale", "evidence_ids", "frontier", "nodes", "edges", "delta",
    )}


def propose_learning_map(repo_root: Path, payload: Any) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    context = _resolve_context(repo_root)
    if not isinstance(payload, dict):
        raise LearningMapProposalError("LearningMap proposal request must be a JSON object")
    allowed = {"id", "proposed_by", "rationale", "evidence_ids", "frontier", "nodes", "edges"}
    if set(payload) - allowed or any(field not in payload for field in allowed - {"id"}):
        raise LearningMapProposalError("LearningMap proposal request fields are invalid")
    proposal_id = payload.get("id") or _new_id("mp")
    if not isinstance(proposal_id, str) or not PROPOSAL_ID.fullmatch(proposal_id):
        raise LearningMapProposalError("LearningMap proposal id is invalid")
    proposed_by = _text(payload["proposed_by"], "proposed_by", 200)
    map_payload = _map_payload(payload)

    try:
        with learning_map._map_lock(context):
            learning_map._assert_writable(context)
            current = learning_map._initialize_context(context)
            candidate = _prepare_map_value(context, current, map_payload)
    except learning_map.LearningMapError as exc:
        raise LearningMapProposalError(str(exc)) from exc

    proposal = {
        "schema_version": SCHEMA_VERSION,
        "kind": "learning-map-proposal",
        "id": proposal_id,
        "workspace_id": context.workspace_id,
        "project_id": context.project_id,
        "mission_id": context.mission_id,
        "base_revision": current["revision"],
        "created_at": _now(),
        "proposed_by": proposed_by,
        "rationale": candidate["rationale"],
        "evidence_ids": candidate["evidence_ids"],
        "frontier": candidate["frontier"],
        "nodes": candidate["nodes"],
        "edges": candidate["edges"],
        "delta": candidate["delta"],
    }
    path = _proposal_root(context) / f"{proposal_id}.json"
    if path.exists() or path.is_symlink():
        existing = validate_proposal(_read_object(path, "LearningMap proposal"), context)
        if _proposal_semantics(existing) == _proposal_semantics(proposal):
            return existing
        raise LearningMapProposalError("LearningMap proposal id was reused with different content")
    _write_new(path, proposal, "LearningMap proposal")
    return proposal


def _load_proposal(context: project_store.ProjectContext, proposal_id: str) -> dict[str, Any]:
    if not PROPOSAL_ID.fullmatch(proposal_id):
        raise LearningMapProposalError("LearningMap proposal id is invalid")
    path = _proposal_root(context) / f"{proposal_id}.json"
    if not path.is_file():
        raise LearningMapProposalError("LearningMap proposal does not exist")
    return validate_proposal(_read_object(path, "LearningMap proposal"), context)


def _load_revision(context: project_store.ProjectContext, revision: int) -> dict[str, Any]:
    assert context.learning_map_path is not None
    path = context.learning_map_path.parent / "revisions" / f"{revision:06d}.json"
    try:
        return learning_map.validate_learning_map(
            learning_map._read_object(path, "LearningMap revision"),
            context.project_id,
        )
    except learning_map.LearningMapError as exc:
        raise LearningMapProposalError(str(exc)) from exc


def _edge_copy(edge: dict[str, Any], labels: dict[str, str]) -> str:
    source = labels.get(edge["source"], edge["source"])
    target = labels.get(edge["target"], edge["target"])
    return f"{source} → {target} ({edge['relation']}, {edge['confidence']})"


def _change_summary(proposal: dict[str, Any], base: dict[str, Any]) -> dict[str, list[str]]:
    proposed_nodes = {item["id"]: item for item in proposal["nodes"]}
    base_nodes = {item["id"]: item for item in base["nodes"]}
    labels = {
        **{key: item["label"] for key, item in base_nodes.items()},
        **{key: item["label"] for key, item in proposed_nodes.items()},
    }
    proposed_edges = {item["id"]: item for item in proposal["edges"]}
    base_edges = {item["id"]: item for item in base["edges"]}
    delta = proposal["delta"]
    return {
        "added_nodes": [labels[item] for item in delta["added_node_ids"]],
        "removed_nodes": [labels[item] for item in delta["removed_node_ids"]],
        "changed_nodes": [labels[item] for item in delta["changed_node_ids"]],
        "added_edges": [_edge_copy(proposed_edges[item], labels) for item in delta["added_edge_ids"]],
        "removed_edges": [_edge_copy(base_edges[item], labels) for item in delta["removed_edge_ids"]],
        "changed_edges": [_edge_copy(proposed_edges[item], labels) for item in delta["changed_edge_ids"]],
        "frontier": [labels[item] for item in proposal["frontier"]],
    }


def pending_learning_map_proposals(repo_root: Path) -> list[dict[str, Any]]:
    context = _resolve_context(repo_root.resolve())
    current = learning_map.load_learning_map(repo_root.resolve())
    if current is None:
        return []
    root = _proposal_root(context)
    if not root.exists():
        return []
    if root.is_symlink():
        raise LearningMapProposalError("LearningMap proposal directory must not be a symbolic link")
    decisions = _decision_root(context)
    result: list[dict[str, Any]] = []
    for path in root.glob("mp_*.json"):
        proposal = validate_proposal(_read_object(path, "LearningMap proposal"), context)
        if (decisions / f"{proposal['id']}.json").exists():
            continue
        base = _load_revision(context, proposal["base_revision"])
        result.append({
            "id": proposal["id"],
            "project_id": proposal["project_id"],
            "mission_id": proposal["mission_id"],
            "base_revision": proposal["base_revision"],
            "current_revision": current["revision"],
            "proposed_by": proposal["proposed_by"],
            "rationale": proposal["rationale"],
            "evidence_count": len(proposal["evidence_ids"]),
            "stale": proposal["base_revision"] != current["revision"],
            "created_at": proposal["created_at"],
            "changes": _change_summary(proposal, base),
        })
    result.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
    return result


def _map_matches_proposal(current: dict[str, Any], proposal: dict[str, Any]) -> bool:
    return all(current[field] == proposal[field] for field in (
        "rationale", "evidence_ids", "frontier", "nodes", "edges", "delta",
    ))


def _validate_decision(value: Any, context: project_store.ProjectContext) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise LearningMapProposalError("LearningMap proposal decision must be an object")
    fields = {
        "schema_version", "kind", "id", "proposal_id", "workspace_id", "project_id",
        "decision", "decided_by", "reason", "created_at", "accepted_revision",
    }
    if set(value) != fields:
        raise LearningMapProposalError("LearningMap proposal decision fields are invalid")
    if value["schema_version"] != SCHEMA_VERSION or value["kind"] != "learning-map-proposal-decision":
        raise LearningMapProposalError("unsupported LearningMap proposal decision schema")
    if not isinstance(value["id"], str) or not DECISION_ID.fullmatch(value["id"]):
        raise LearningMapProposalError("LearningMap proposal decision id is invalid")
    if value["workspace_id"] != context.workspace_id or value["project_id"] != context.project_id:
        raise LearningMapProposalError("LearningMap proposal decision scope does not match")
    if value["decision"] not in ("accepted", "rejected"):
        raise LearningMapProposalError("LearningMap proposal decision is invalid")
    accepted_revision = value["accepted_revision"]
    if value["decision"] == "accepted":
        if isinstance(accepted_revision, bool) or not isinstance(accepted_revision, int) or accepted_revision < 1:
            raise LearningMapProposalError("accepted proposal decision needs accepted_revision")
    elif accepted_revision is not None:
        raise LearningMapProposalError("rejected proposal decision cannot have accepted_revision")
    return value


def decide_learning_map_proposal(
    repo_root: Path,
    proposal_id: str,
    decision: str,
    reason: str,
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    context = _resolve_context(repo_root)
    if decision not in ("accepted", "rejected"):
        raise LearningMapProposalError("decision must be accepted or rejected")
    reason = _text(reason, "reason", 600)
    decision_path = _decision_root(context) / f"{proposal_id}.json"

    with _decision_lock(context, proposal_id):
        if decision_path.exists() or decision_path.is_symlink():
            existing = _validate_decision(
                _read_object(decision_path, "LearningMap proposal decision"),
                context,
            )
            if existing["decision"] == decision and existing["reason"] == reason:
                return existing
            raise LearningMapProposalError("LearningMap proposal already has a decision")

        proposal = _load_proposal(context, proposal_id)
        try:
            learning_map._assert_writable(context)
        except learning_map.LearningMapError as exc:
            raise LearningMapProposalError(str(exc)) from exc

        accepted_revision: int | None = None
        if decision == "accepted":
            try:
                with learning_map._map_lock(context):
                    learning_map._assert_writable(context)
                    current = learning_map._initialize_context(context)
                    if current["revision"] == proposal["base_revision"]:
                        candidate = _prepare_map_value(context, current, _map_payload(proposal))
                        learning_map._write_revision(context, candidate)
                        accepted_revision = candidate["revision"]
                    elif (
                        current["revision"] == proposal["base_revision"] + 1
                        and _map_matches_proposal(current, proposal)
                    ):
                        accepted_revision = current["revision"]
                    else:
                        raise LearningMapProposalError(
                            "stale LearningMap proposal; the canonical map revision changed"
                        )
            except learning_map.LearningMapError as exc:
                raise LearningMapProposalError(str(exc)) from exc

        value = {
            "schema_version": SCHEMA_VERSION,
            "kind": "learning-map-proposal-decision",
            "id": _new_id("mpd"),
            "proposal_id": proposal_id,
            "workspace_id": context.workspace_id,
            "project_id": context.project_id,
            "decision": decision,
            "decided_by": "workspace-learner",
            "reason": reason,
            "created_at": _now(),
            "accepted_revision": accepted_revision,
        }
        _write_new(decision_path, value, "LearningMap proposal decision")
        return value


def _read_payload(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise LearningMapProposalError(f"cannot read proposal payload: {path}") from exc


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ai4learning LearningMap proposal review")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    sub = parser.add_subparsers(dest="command", required=True)
    propose = sub.add_parser("propose", help="record one immutable topology proposal")
    propose.add_argument("payload", type=Path)
    sub.add_parser("list", help="list unresolved topology proposals")
    decide = sub.add_parser("decide", help="accept or reject one topology proposal")
    decide.add_argument("proposal_id")
    decide.add_argument("decision", choices=("accepted", "rejected"))
    decide.add_argument("reason")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    repo_root = args.repo.resolve()
    try:
        if args.command == "propose":
            value = propose_learning_map(repo_root, _read_payload(args.payload))
        elif args.command == "list":
            value = {"proposals": pending_learning_map_proposals(repo_root)}
        else:
            value = decide_learning_map_proposal(
                repo_root, args.proposal_id, args.decision, args.reason
            )
        print(json.dumps(value, ensure_ascii=False, indent=2))
        return 0
    except (LearningMapProposalError, project_store.ProjectStoreError) as exc:
        print(f"error: {exc}", file=__import__("sys").stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
