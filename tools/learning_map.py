#!/usr/bin/env python3
"""Validated, revisioned topology storage for the canonical LearningMap.

The map contains a revisable domain/topology hypothesis only. Accepted learner
mastery remains in the Runtime state projection and is joined by readers.
"""

from __future__ import annotations

import json
import os
import tempfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

try:
    from tools import project_store
except ImportError:  # Direct execution through tools/learning.py
    import project_store


SCHEMA_VERSION = "0.1"
NODE_KINDS = ("concept", "procedure", "strategy")
MISSION_RELEVANCE = ("core", "supporting", "optional")
EDGE_RELATIONS = ("prerequisite", "component", "prepares", "contrast", "transfer")
CONFIDENCE = ("low", "medium", "high")
EVIDENCE_PREFIX = "ev_"
MAX_NODES = 500
MAX_EDGES = 2000


class LearningMapError(RuntimeError):
    """A LearningMap payload or storage transition is invalid."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.parent.is_symlink():
        raise LearningMapError(f"LearningMap parent must not be a symbolic link: {path.parent}")
    handle, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary_path = Path(temporary)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        temporary_path.replace(path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise


def _write_text_atomic(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.parent.is_symlink():
        raise LearningMapError(f"LearningMap parent must not be a symbolic link: {path.parent}")
    handle, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary_path = Path(temporary)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            stream.write(value)
            stream.flush()
            os.fsync(stream.fileno())
        temporary_path.replace(path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise


def _read_object(path: Path, label: str) -> dict[str, Any]:
    if path.is_symlink():
        raise LearningMapError(f"{label} must not be a symbolic link: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise LearningMapError(f"cannot read {label}: {path}") from exc
    except json.JSONDecodeError as exc:
        raise LearningMapError(f"invalid JSON in {label}: {path}") from exc
    if not isinstance(value, dict):
        raise LearningMapError(f"{label} must be a JSON object")
    return value


def _exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    unknown = set(value) - expected
    missing = expected - set(value)
    if unknown or missing:
        details = []
        if missing:
            details.append("missing " + ", ".join(sorted(missing)))
        if unknown:
            details.append("unsupported " + ", ".join(sorted(unknown)))
        raise LearningMapError(f"{label} has " + "; ".join(details))


def _text(value: Any, label: str, maximum: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise LearningMapError(f"{label} must be a non-empty string of at most {maximum} characters")
    return value.strip()


def _projection_text(value: str) -> str:
    return " ".join(value.split()).replace("|", "\\|")


def _local_id(value: Any, label: str) -> str:
    if not isinstance(value, str):
        raise LearningMapError(f"{label} must be a local identifier")
    try:
        return project_store.validate_local_id(value, label)
    except project_store.ProjectStoreError as exc:
        raise LearningMapError(str(exc)) from exc


def _unique_ids(value: Any, label: str, maximum: int) -> list[str]:
    if not isinstance(value, list) or len(value) > maximum:
        raise LearningMapError(f"{label} must be a list with at most {maximum} items")
    result = [_local_id(item, label) for item in value]
    if len(set(result)) != len(result):
        raise LearningMapError(f"{label} must not contain duplicates")
    return result


def _evidence_ids(value: Any) -> list[str]:
    if not isinstance(value, list) or len(value) > 50:
        raise LearningMapError("evidence_ids must be a list with at most 50 items")
    result: list[str] = []
    for item in value:
        if (
            not isinstance(item, str)
            or not item.startswith(EVIDENCE_PREFIX)
            or len(item) < 6
            or len(item) > 131
            or any(char not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for char in item[3:])
        ):
            raise LearningMapError("evidence_ids must contain Runtime evidence identifiers")
        result.append(item)
    if len(set(result)) != len(result):
        raise LearningMapError("evidence_ids must not contain duplicates")
    return result


def _nodes(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list) or len(value) > MAX_NODES:
        raise LearningMapError(f"nodes must be a list with at most {MAX_NODES} items")
    result: list[dict[str, str]] = []
    ids: set[str] = set()
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise LearningMapError(f"nodes[{index}] must be an object")
        _exact_keys(item, {"id", "label", "kind", "mission_relevance"}, f"nodes[{index}]")
        node_id = _local_id(item["id"], f"nodes[{index}].id")
        if node_id in ids:
            raise LearningMapError("node ids must be unique")
        ids.add(node_id)
        kind = item["kind"]
        relevance = item["mission_relevance"]
        if kind not in NODE_KINDS:
            raise LearningMapError(f"nodes[{index}].kind is invalid")
        if relevance not in MISSION_RELEVANCE:
            raise LearningMapError(f"nodes[{index}].mission_relevance is invalid")
        result.append({
            "id": node_id,
            "label": _text(item["label"], f"nodes[{index}].label", 200),
            "kind": kind,
            "mission_relevance": relevance,
        })
    return result


def _edges(value: Any, node_ids: set[str]) -> list[dict[str, str]]:
    if not isinstance(value, list) or len(value) > MAX_EDGES:
        raise LearningMapError(f"edges must be a list with at most {MAX_EDGES} items")
    result: list[dict[str, str]] = []
    ids: set[str] = set()
    signatures: set[tuple[str, str, str]] = set()
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise LearningMapError(f"edges[{index}] must be an object")
        _exact_keys(
            item,
            {"id", "source", "target", "relation", "confidence"},
            f"edges[{index}]",
        )
        edge_id = _local_id(item["id"], f"edges[{index}].id")
        source = _local_id(item["source"], f"edges[{index}].source")
        target = _local_id(item["target"], f"edges[{index}].target")
        if edge_id in ids:
            raise LearningMapError("edge ids must be unique")
        if source == target:
            raise LearningMapError("LearningMap edges cannot be self-referential")
        if source not in node_ids or target not in node_ids:
            raise LearningMapError("every edge source and target must reference a node")
        relation = item["relation"]
        confidence = item["confidence"]
        if relation not in EDGE_RELATIONS:
            raise LearningMapError(f"edges[{index}].relation is invalid")
        if confidence not in CONFIDENCE:
            raise LearningMapError(f"edges[{index}].confidence is invalid")
        signature = (source, target, relation)
        if signature in signatures:
            raise LearningMapError("duplicate semantic edges are not allowed")
        signatures.add(signature)
        ids.add(edge_id)
        result.append({
            "id": edge_id,
            "source": source,
            "target": target,
            "relation": relation,
            "confidence": confidence,
        })
    return result


def _delta(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise LearningMapError("delta must be an object")
    fields = {
        "added_node_ids", "removed_node_ids", "changed_node_ids",
        "added_edge_ids", "removed_edge_ids", "changed_edge_ids",
        "frontier_changed",
    }
    _exact_keys(value, fields, "delta")
    if not isinstance(value["frontier_changed"], bool):
        raise LearningMapError("delta.frontier_changed must be a boolean")
    list_fields = (
        "added_node_ids", "removed_node_ids", "changed_node_ids",
        "added_edge_ids", "removed_edge_ids", "changed_edge_ids",
    )
    return {
        **{
            field: _unique_ids(value[field], f"delta.{field}", MAX_EDGES)
            for field in list_fields
        },
        "frontier_changed": value["frontier_changed"],
    }


def validate_learning_map(value: Any, expected_project_id: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise LearningMapError("LearningMap must be a JSON object")
    fields = {
        "schema_version", "kind", "project_id", "revision", "parent_revision",
        "created_at", "updated_at", "rationale", "evidence_ids", "frontier",
        "nodes", "edges", "delta",
    }
    _exact_keys(value, fields, "LearningMap")
    if value["schema_version"] != SCHEMA_VERSION or value["kind"] != "learning-map":
        raise LearningMapError("unsupported LearningMap schema")
    project_id = _local_id(value["project_id"], "project_id")
    if project_id != expected_project_id:
        raise LearningMapError("LearningMap project_id does not match its Project")
    revision = value["revision"]
    parent = value["parent_revision"]
    if isinstance(revision, bool) or not isinstance(revision, int) or revision < 0:
        raise LearningMapError("LearningMap revision must be a non-negative integer")
    if revision == 0 and parent is not None:
        raise LearningMapError("LearningMap revision 0 cannot have a parent")
    if revision > 0 and parent != revision - 1:
        raise LearningMapError("LearningMap parent_revision must reference the previous revision")
    nodes = _nodes(value["nodes"])
    node_ids = {item["id"] for item in nodes}
    edges = _edges(value["edges"], node_ids)
    frontier = _unique_ids(value["frontier"], "frontier", 12)
    if any(item not in node_ids for item in frontier):
        raise LearningMapError("frontier must reference LearningMap nodes")
    evidence_ids = _evidence_ids(value["evidence_ids"])
    delta = _delta(value["delta"])
    changed = any(delta[field] for field in (
        "added_node_ids", "removed_node_ids", "changed_node_ids",
        "added_edge_ids", "removed_edge_ids", "changed_edge_ids",
    )) or delta["frontier_changed"]
    if revision == 0 and (nodes or edges or frontier or evidence_ids or changed):
        raise LearningMapError("LearningMap revision 0 must be an honest empty map")
    if revision > 0 and (not nodes or not frontier or not evidence_ids or not changed):
        raise LearningMapError("LearningMap revisions require nodes, a frontier, evidence, and a delta")
    return {
        "schema_version": SCHEMA_VERSION,
        "kind": "learning-map",
        "project_id": project_id,
        "revision": revision,
        "parent_revision": parent,
        "created_at": _text(value["created_at"], "created_at", 100),
        "updated_at": _text(value["updated_at"], "updated_at", 100),
        "rationale": _text(value["rationale"], "rationale", 1600),
        "evidence_ids": evidence_ids,
        "frontier": frontier,
        "nodes": nodes,
        "edges": edges,
        "delta": delta,
    }


def _empty_map(project_id: str, timestamp: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "kind": "learning-map",
        "project_id": project_id,
        "revision": 0,
        "parent_revision": None,
        "created_at": timestamp,
        "updated_at": timestamp,
        "rationale": "Initial empty topology; no learner evidence has established a map yet.",
        "evidence_ids": [],
        "frontier": [],
        "nodes": [],
        "edges": [],
        "delta": {
            "added_node_ids": [],
            "removed_node_ids": [],
            "changed_node_ids": [],
            "added_edge_ids": [],
            "removed_edge_ids": [],
            "changed_edge_ids": [],
            "frontier_changed": False,
        },
    }


def _roadmap_projection(value: dict[str, Any]) -> str:
    """Render the canonical topology as a human-readable, non-authoritative view."""
    frontier = set(value["frontier"])
    node_lines = [
        "| Node | ID | Kind | Mission relevance | Frontier |",
        "|---|---|---|---|---|",
    ]
    node_lines.extend(
        f"| {_projection_text(node['label'])} | `{node['id']}` | {node['kind']} | "
        f"{node['mission_relevance']} | {'yes' if node['id'] in frontier else ''} |"
        for node in value["nodes"]
    )
    if not value["nodes"]:
        node_lines.append("| No evidence-grounded nodes yet | — | — | — | — |")

    edge_lines = [
        "| Source | Relation | Target | Confidence |",
        "|---|---|---|---|",
    ]
    edge_lines.extend(
        f"| `{edge['source']}` | {edge['relation']} | `{edge['target']}` | {edge['confidence']} |"
        for edge in value["edges"]
    )
    if not value["edges"]:
        edge_lines.append("| — | No explicit edges yet | — | — |")

    delta = value["delta"]
    delta_parts = [
        f"+nodes {', '.join(delta['added_node_ids'])}" if delta["added_node_ids"] else "",
        f"-nodes {', '.join(delta['removed_node_ids'])}" if delta["removed_node_ids"] else "",
        f"~nodes {', '.join(delta['changed_node_ids'])}" if delta["changed_node_ids"] else "",
        f"+edges {', '.join(delta['added_edge_ids'])}" if delta["added_edge_ids"] else "",
        f"-edges {', '.join(delta['removed_edge_ids'])}" if delta["removed_edge_ids"] else "",
        f"~edges {', '.join(delta['changed_edge_ids'])}" if delta["changed_edge_ids"] else "",
        "frontier changed" if delta["frontier_changed"] else "",
    ]
    delta_summary = "; ".join(part for part in delta_parts if part) or "initial empty revision"
    evidence = ", ".join(f"`{item}`" for item in value["evidence_ids"]) or "none (revision 0 only)"
    parent = value["parent_revision"] if value["parent_revision"] is not None else "none"
    return "\n".join([
        "# Learning Roadmap",
        "",
        "> Human-readable projection of `map/current.json`. Do not edit this file directly.",
        "> Mastery state is intentionally stored in `runtime/state.json` and joined by readers.",
        "",
        f"- Revision: **{value['revision']}** (parent: {parent})",
        f"- Updated: {value['updated_at']}",
        f"- Evidence: {evidence}",
        f"- Rationale: {_projection_text(value['rationale'])}",
        "",
        "## Nodes",
        "",
        *node_lines,
        "",
        "## Edges",
        "",
        *edge_lines,
        "",
        "## Revision delta",
        "",
        delta_summary,
        "",
    ])


def _write_revision(context: project_store.ProjectContext, value: dict[str, Any]) -> None:
    assert context.learning_map_path is not None
    revisions = context.learning_map_path.parent / "revisions"
    if revisions.is_symlink():
        raise LearningMapError("LearningMap revisions directory must not be a symbolic link")
    revision_path = revisions / f"{value['revision']:06d}.json"
    if revision_path.exists() or revision_path.is_symlink():
        existing = _read_object(revision_path, "LearningMap revision")
        if existing != value:
            raise LearningMapError("an immutable LearningMap revision already exists")
    else:
        _write_json_atomic(revision_path, value)
    _write_json_atomic(context.learning_map_path, value)
    _write_text_atomic(context.roadmap_markdown_path, _roadmap_projection(value))


@contextmanager
def _map_lock(context: project_store.ProjectContext) -> Iterator[None]:
    assert context.learning_map_path is not None
    map_root = context.learning_map_path.parent
    if map_root.is_symlink():
        raise LearningMapError("LearningMap directory must not be a symbolic link")
    map_root.mkdir(parents=True, exist_ok=True)
    lock = map_root / ".write.lock"
    try:
        handle = lock.open("x", encoding="utf-8")
    except FileExistsError as exc:
        raise LearningMapError("another LearningMap write is already in progress") from exc
    try:
        handle.write(f"pid={os.getpid()}\n")
        handle.close()
        yield
    finally:
        lock.unlink(missing_ok=True)


def _initialize_context(context: project_store.ProjectContext) -> dict[str, Any]:
    assert context.learning_map_path is not None
    if context.learning_map_path.exists():
        return validate_learning_map(
            _read_object(context.learning_map_path, "LearningMap"),
            context.project_id,
        )
    value = _empty_map(context.project_id, _now())
    _write_revision(context, value)
    return value


def initialize_learning_map(repo_root: Path) -> dict[str, Any]:
    context = project_store.resolve_project_context(repo_root.resolve())
    if context.layout != project_store.LAYOUT_WORKSPACE or context.learning_map_path is None:
        raise LearningMapError("canonical LearningMap requires workspace-v0.2")
    with _map_lock(context):
        return _initialize_context(context)


def load_learning_map(repo_root: Path) -> dict[str, Any] | None:
    context = project_store.resolve_project_context(repo_root.resolve())
    if context.learning_map_path is None or not context.learning_map_path.is_file():
        return None
    return validate_learning_map(
        _read_object(context.learning_map_path, "LearningMap"),
        context.project_id,
    )


def _assert_writable(context: project_store.ProjectContext) -> None:
    if context.project_status == "paused":
        raise LearningMapError("paused Project is read-only; resume it before revising the map")
    if context.project_status == "archived" and context.maintenance_status != "study_active":
        raise LearningMapError("archived Project map is read-only outside maintenance study")
    if context.project_status == "active" and context.mission_status != "active":
        raise LearningMapError("active Project requires an active Mission before revising the map")


def _assert_evidence(context: project_store.ProjectContext, evidence_ids: list[str]) -> None:
    for evidence_id in evidence_ids:
        path = context.runtime_root / "receipts" / "evidence" / f"{evidence_id}.json"
        evidence = _read_object(path, f"evidence {evidence_id}")
        if evidence.get("id") != evidence_id or evidence.get("kind") != "evidence":
            raise LearningMapError(f"invalid evidence receipt: {evidence_id}")
        if evidence.get("project_id") != context.project_id:
            raise LearningMapError("LearningMap evidence must stay within one Project")
        if evidence.get("workspace_id") != context.workspace_id:
            raise LearningMapError("LearningMap evidence Workspace scope does not match")


def _changes(before: list[dict[str, Any]], after: list[dict[str, Any]]) -> tuple[list[str], list[str], list[str]]:
    old = {item["id"]: item for item in before}
    new = {item["id"]: item for item in after}
    return (
        sorted(new.keys() - old.keys()),
        sorted(old.keys() - new.keys()),
        sorted(key for key in old.keys() & new.keys() if old[key] != new[key]),
    )


def update_learning_map(repo_root: Path, payload: Any) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    context = project_store.resolve_project_context(repo_root)
    if context.layout != project_store.LAYOUT_WORKSPACE or context.learning_map_path is None:
        raise LearningMapError("LearningMap updates require workspace-v0.2")
    with _map_lock(context):
        _assert_writable(context)
        if not isinstance(payload, dict):
            raise LearningMapError("LearningMap update must be a JSON object")
        _exact_keys(payload, {"nodes", "edges", "frontier", "rationale", "evidence_ids"}, "LearningMap update")
        current = _initialize_context(context)
        nodes = _nodes(payload["nodes"])
        if not nodes:
            raise LearningMapError("an evidence-grounded LearningMap update must contain nodes")
        node_ids = {item["id"] for item in nodes}
        edges = _edges(payload["edges"], node_ids)
        frontier = _unique_ids(payload["frontier"], "frontier", 12)
        if not frontier or any(item not in node_ids for item in frontier):
            raise LearningMapError("an updated LearningMap needs a valid current frontier")
        evidence_ids = _evidence_ids(payload["evidence_ids"])
        if not evidence_ids:
            raise LearningMapError("LearningMap revisions require project-local evidence")
        _assert_evidence(context, evidence_ids)
        added_nodes, removed_nodes, changed_nodes = _changes(current["nodes"], nodes)
        added_edges, removed_edges, changed_edges = _changes(current["edges"], edges)
        frontier_changed = current["frontier"] != frontier
        if not any((added_nodes, removed_nodes, changed_nodes, added_edges, removed_edges, changed_edges, frontier_changed)):
            raise LearningMapError("LearningMap update does not change topology or frontier")
        timestamp = _now()
        value = {
            "schema_version": SCHEMA_VERSION,
            "kind": "learning-map",
            "project_id": context.project_id,
            "revision": current["revision"] + 1,
            "parent_revision": current["revision"],
            "created_at": current["created_at"],
            "updated_at": timestamp,
            "rationale": _text(payload["rationale"], "rationale", 1600),
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
        validated = validate_learning_map(value, context.project_id)
        _write_revision(context, validated)
        return validated
