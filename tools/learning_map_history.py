#!/usr/bin/env python3
"""Read-only node history over validated append-only LearningMap revisions."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from tools import learning_map, project_store
except ImportError:  # Direct execution
    import learning_map
    import project_store


class LearningMapHistoryError(RuntimeError):
    pass


def _resolve_context(repo_root: Path) -> project_store.ProjectContext:
    context = project_store.resolve_project_context(repo_root.resolve())
    if context.layout != project_store.LAYOUT_WORKSPACE or context.learning_map_path is None:
        raise LearningMapHistoryError("LearningMap history requires a selected workspace-v0.2 Project")
    return context


def _node_id(value: str) -> str:
    try:
        return project_store.validate_local_id(value, "node_id")
    except project_store.ProjectStoreError as exc:
        raise LearningMapHistoryError(str(exc)) from exc


def _load_revisions(
    repo_root: Path,
    context: project_store.ProjectContext,
) -> list[dict[str, Any]]:
    assert context.learning_map_path is not None
    root = context.learning_map_path.parent / "revisions"
    if root.is_symlink():
        raise LearningMapHistoryError("LearningMap revisions directory must not be a symbolic link")
    if not root.is_dir():
        return []
    revisions: list[dict[str, Any]] = []
    for path in sorted(root.glob("*.json")):
        try:
            value = learning_map.validate_learning_map(
                learning_map._read_object(path, "LearningMap revision"),
                context.project_id,
            )
        except learning_map.LearningMapError as exc:
            raise LearningMapHistoryError(str(exc)) from exc
        revisions.append(value)
    for index, revision in enumerate(revisions):
        if revision["revision"] != index:
            raise LearningMapHistoryError("LearningMap revision history is not contiguous")
        expected_parent = None if index == 0 else index - 1
        if revision["parent_revision"] != expected_parent:
            raise LearningMapHistoryError("LearningMap revision parent chain is invalid")
    current = learning_map.load_learning_map(repo_root.resolve())
    if current is not None and (not revisions or revisions[-1] != current):
        raise LearningMapHistoryError("LearningMap current revision does not match immutable history")
    return revisions


def _relations(value: dict[str, Any], node_id: str) -> list[str]:
    labels = {item["id"]: item["label"] for item in value["nodes"]}
    result: list[str] = []
    for edge in value["edges"]:
        if edge["source"] == node_id:
            target = labels.get(edge["target"], edge["target"])
            result.append(f"out: {edge['relation']} → {target} ({edge['confidence']})")
        elif edge["target"] == node_id:
            source = labels.get(edge["source"], edge["source"])
            result.append(f"in: {source} → {edge['relation']} ({edge['confidence']})")
    return sorted(result)


def _snapshot(value: dict[str, Any], node_id: str) -> dict[str, Any] | None:
    node = next((item for item in value["nodes"] if item["id"] == node_id), None)
    if node is None:
        return None
    return {
        "label": node["label"],
        "kind": node["kind"],
        "mission_relevance": node["mission_relevance"],
        "frontier": node_id in value["frontier"],
        "relations": _relations(value, node_id),
    }


def _changes(before: dict[str, Any] | None, after: dict[str, Any] | None) -> list[str]:
    if before is None and after is None:
        return []
    if before is None:
        result = ["added"]
        if after and after["frontier"]:
            result.append("entered_frontier")
        if after and after["relations"]:
            result.append("relations_changed")
        return result
    if after is None:
        result = ["removed"]
        if before["frontier"]:
            result.append("left_frontier")
        if before["relations"]:
            result.append("relations_changed")
        return result

    result: list[str] = []
    if any(before[field] != after[field] for field in ("label", "kind", "mission_relevance")):
        result.append("node_changed")
    if before["frontier"] != after["frontier"]:
        result.append("entered_frontier" if after["frontier"] else "left_frontier")
    if before["relations"] != after["relations"]:
        result.append("relations_changed")
    return result


def node_history(repo_root: Path, node_id: str, *, limit: int = 20) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    context = _resolve_context(repo_root)
    node_id = _node_id(node_id)
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1 or limit > 100:
        raise LearningMapHistoryError("limit must be an integer from 1 to 100")
    revisions = _load_revisions(repo_root, context)
    if not revisions:
        return {
            "project_id": context.project_id,
            "node_id": node_id,
            "current_revision": 0,
            "events": [],
        }

    events: list[dict[str, Any]] = []
    previous: dict[str, Any] | None = None
    for revision in revisions:
        after = _snapshot(revision, node_id)
        change_kinds = _changes(previous, after)
        if change_kinds:
            events.append({
                "revision": revision["revision"],
                "updated_at": revision["updated_at"],
                "rationale": revision["rationale"],
                "evidence_count": len(revision["evidence_ids"]),
                "changes": change_kinds,
                "before": previous,
                "after": after,
            })
        previous = after

    return {
        "project_id": context.project_id,
        "node_id": node_id,
        "current_revision": revisions[-1]["revision"],
        "events": list(reversed(events[-limit:])),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ai4learning LearningMap node history reader")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    sub = parser.add_subparsers(dest="command", required=True)
    node = sub.add_parser("node", help="show meaningful revision events for one node")
    node.add_argument("node_id")
    node.add_argument("--limit", type=int, default=20)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        value = node_history(args.repo.resolve(), args.node_id, limit=args.limit)
        print(json.dumps(value, ensure_ascii=False, indent=2))
        return 0
    except (LearningMapHistoryError, project_store.ProjectStoreError) as exc:
        print(f"error: {exc}", file=__import__("sys").stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
