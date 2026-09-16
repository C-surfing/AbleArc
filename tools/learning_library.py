#!/usr/bin/env python3
"""Typed, provenance-aware saved materials for one local learning Project."""

from __future__ import annotations

import json
import re
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

try:
    from tools import project_store
    from tools import runtime as learning_runtime
except ImportError:  # Direct execution through tools/learning.py
    import project_store
    import runtime as learning_runtime


SCHEMA_VERSION = "0.1"
MATERIAL_ID_PATTERN = re.compile(r"^mat_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$")
MATERIAL_TYPES = (
    "concept_note",
    "derivation",
    "worked_example",
    "formula_sheet",
    "code_artifact",
    "diagram",
    "misconception_note",
    "source_note",
    "feynman_explanation",
)
PAYLOAD_FIELDS = {
    "material_type", "title", "summary", "why_return", "body_markdown",
    "concept_ids", "evidence_ids", "source_refs", "tags",
}
RECORD_FIELDS = PAYLOAD_FIELDS | {
    "schema_version", "kind", "id", "workspace_id", "project_id",
    "mission_id", "created_at",
}
MAX_MATERIALS = 500


class LearningLibraryError(RuntimeError):
    """A LearningMaterial violates storage, provenance, or lifecycle rules."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _read_object(path: Path, label: str) -> dict[str, Any]:
    if path.is_symlink():
        raise LearningLibraryError(f"{label} must not be a symbolic link: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise LearningLibraryError(f"cannot read valid {label}: {path}") from exc
    if not isinstance(value, dict):
        raise LearningLibraryError(f"{label} must be a JSON object")
    return value


def _write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(
            json.dumps(value, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


@contextmanager
def _write_lock(learning_root: Path) -> Iterator[None]:
    """Serialize material writes with Project lifecycle transitions."""
    if learning_root.is_symlink():
        raise LearningLibraryError(".learning must not be a symbolic link")
    learning_root.mkdir(parents=True, exist_ok=True)
    lock = learning_root / ".project-lifecycle.lock"
    try:
        handle = lock.open("x", encoding="utf-8")
    except FileExistsError as exc:
        raise LearningLibraryError("another Project lifecycle write is already in progress") from exc
    try:
        handle.write(f"{uuid.uuid4().hex}\n")
        handle.close()
        yield
    finally:
        lock.unlink(missing_ok=True)


def _text(value: Any, label: str, maximum: int, *, preserve: bool = False) -> str:
    if not isinstance(value, str):
        raise LearningLibraryError(f"{label} must be a string")
    normalized = value.strip() if preserve else " ".join(value.split())
    if not normalized or len(normalized) > maximum:
        raise LearningLibraryError(f"{label} must be 1-{maximum} characters")
    return normalized


def _unique_texts(value: Any, label: str, maximum_items: int, maximum_length: int) -> list[str]:
    if not isinstance(value, list) or len(value) > maximum_items:
        raise LearningLibraryError(f"{label} must contain at most {maximum_items} items")
    result = [_text(item, f"{label} item", maximum_length) for item in value]
    if len(set(result)) != len(result):
        raise LearningLibraryError(f"{label} must not contain duplicates")
    return result


def _timestamp(value: Any) -> str:
    normalized = _text(value, "created_at", 100)
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError as exc:
        raise LearningLibraryError("created_at must be an ISO-8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise LearningLibraryError("created_at must include a timezone")
    return normalized


def _local_ids(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or len(value) > 30:
        raise LearningLibraryError(f"{label} must contain at most 30 items")
    try:
        result = [project_store.validate_local_id(item, label) for item in value]
    except (project_store.ProjectStoreError, TypeError) as exc:
        raise LearningLibraryError(f"{label} must contain safe local identifiers") from exc
    if len(set(result)) != len(result):
        raise LearningLibraryError(f"{label} must not contain duplicates")
    return result


def _evidence_ids(value: Any) -> list[str]:
    if (
        not isinstance(value, list)
        or len(value) > 30
        or any(
            not isinstance(item, str)
            or not project_store.EVIDENCE_ID_PATTERN.fullmatch(item)
            for item in value
        )
        or len(set(value)) != len(value)
    ):
        raise LearningLibraryError(
            "evidence_ids must contain at most 30 unique Runtime Evidence identifiers"
        )
    return value


def _validate_material(
    value: Any,
    *,
    expected_workspace_id: str | None = None,
    expected_project_id: str | None = None,
) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != RECORD_FIELDS:
        raise LearningLibraryError("LearningMaterial contains unsupported fields")
    if value["schema_version"] != SCHEMA_VERSION or value["kind"] != "learning-material":
        raise LearningLibraryError("LearningMaterial contract is unsupported")
    material_id = value["id"]
    if not isinstance(material_id, str) or not MATERIAL_ID_PATTERN.fullmatch(material_id):
        raise LearningLibraryError("LearningMaterial id is invalid")
    workspace_id = value["workspace_id"]
    if (
        not isinstance(workspace_id, str)
        or not project_store.WORKSPACE_ID_PATTERN.fullmatch(workspace_id)
        or (expected_workspace_id is not None and workspace_id != expected_workspace_id)
    ):
        raise LearningLibraryError("LearningMaterial Workspace scope is invalid")
    try:
        project_id = project_store.validate_local_id(value["project_id"], "project_id")
        mission_id = project_store.validate_local_id(value["mission_id"], "mission_id")
    except project_store.ProjectStoreError as exc:
        raise LearningLibraryError(str(exc)) from exc
    if expected_project_id is not None and project_id != expected_project_id:
        raise LearningLibraryError("LearningMaterial Project scope is invalid")
    material_type = value["material_type"]
    if material_type not in MATERIAL_TYPES:
        raise LearningLibraryError("LearningMaterial type is invalid")
    evidence_ids = _evidence_ids(value["evidence_ids"])
    source_refs = _unique_texts(value["source_refs"], "source_refs", 20, 1000)
    if not evidence_ids and not source_refs:
        raise LearningLibraryError("LearningMaterial requires Evidence or source provenance")
    if material_type in {"misconception_note", "feynman_explanation"} and not evidence_ids:
        raise LearningLibraryError(f"{material_type} requires Runtime Evidence provenance")
    if material_type == "source_note" and not source_refs:
        raise LearningLibraryError("source_note requires at least one source reference")
    return {
        "schema_version": SCHEMA_VERSION,
        "kind": "learning-material",
        "id": material_id,
        "workspace_id": workspace_id,
        "project_id": project_id,
        "mission_id": mission_id,
        "material_type": material_type,
        "title": _text(value["title"], "title", 200),
        "summary": _text(value["summary"], "summary", 800),
        "why_return": _text(value["why_return"], "why_return", 800),
        "body_markdown": _text(
            value["body_markdown"],
            "body_markdown",
            100_000,
            preserve=True,
        ),
        "concept_ids": _local_ids(value["concept_ids"], "concept_ids"),
        "evidence_ids": evidence_ids,
        "source_refs": source_refs,
        "tags": _unique_texts(value["tags"], "tags", 20, 64),
        "created_at": _timestamp(value["created_at"]),
    }


def _context(repo_root: Path) -> project_store.ProjectContext:
    try:
        context = project_store.resolve_project_context(repo_root.resolve())
    except project_store.ProjectStoreError as exc:
        raise LearningLibraryError(str(exc)) from exc
    if (
        context.layout != project_store.LAYOUT_WORKSPACE
        or context.workspace_id is None
        or context.mission_id is None
    ):
        raise LearningLibraryError("Learning Library requires a selected workspace-v0.2 Mission")
    return context


def _assert_writable(context: project_store.ProjectContext) -> None:
    if context.project_status == "active" and context.mission_status == "active":
        return
    if context.project_status == "archived" and context.maintenance_status == "study_active":
        return
    raise LearningLibraryError(
        "LearningMaterial writes require an active Mission or an active maintenance study"
    )


def _assert_mission_scope(
    context: project_store.ProjectContext,
    mission_id: str,
) -> None:
    mission_root = context.project_root / "missions" / mission_id
    if mission_root.is_symlink():
        raise LearningLibraryError("LearningMaterial Mission directory must not be a symbolic link")
    manifest = _read_object(mission_root / "mission.json", "Mission manifest")
    if (
        manifest.get("schema_version") != "0.2"
        or manifest.get("id") != mission_id
        or manifest.get("project_id") != context.project_id
    ):
        raise LearningLibraryError("LearningMaterial Mission scope is invalid")


def _assert_evidence(
    repo_root: Path,
    context: project_store.ProjectContext,
    evidence_ids: list[str],
) -> None:
    for evidence_id in evidence_ids:
        try:
            receipt = learning_runtime.load_receipt(repo_root, "evidence", evidence_id)
        except learning_runtime.RuntimeContractError as exc:
            raise LearningLibraryError(f"cannot use Evidence {evidence_id}: {exc}") from exc
        if (
            receipt.get("workspace_id") != context.workspace_id
            or receipt.get("project_id") != context.project_id
            or receipt.get("mission_id") != context.mission_id
        ):
            raise LearningLibraryError("LearningMaterial Evidence must stay within its Mission")


def save_material(repo_root: Path, payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise LearningLibraryError("LearningMaterial input must be a JSON object")
    unknown = set(payload) - PAYLOAD_FIELDS - {"id"}
    missing = PAYLOAD_FIELDS - set(payload)
    if unknown or missing:
        raise LearningLibraryError("LearningMaterial input fields are incomplete or unsupported")
    repo_root = repo_root.resolve()
    supplied_id = payload.get("id")
    if supplied_id is None:
        material_id = f"mat_{uuid.uuid4().hex[:16]}"
    elif isinstance(supplied_id, str) and MATERIAL_ID_PATTERN.fullmatch(supplied_id):
        material_id = supplied_id
    else:
        raise LearningLibraryError("LearningMaterial id is invalid")
    with _write_lock(repo_root / ".learning"):
        context = _context(repo_root)
        _assert_writable(context)
        candidate = _validate_material({
            "schema_version": SCHEMA_VERSION,
            "kind": "learning-material",
            "id": material_id,
            "workspace_id": context.workspace_id,
            "project_id": context.project_id,
            "mission_id": context.mission_id,
            "material_type": payload["material_type"],
            "title": payload["title"],
            "summary": payload["summary"],
            "why_return": payload["why_return"],
            "body_markdown": payload["body_markdown"],
            "concept_ids": payload["concept_ids"],
            "evidence_ids": payload["evidence_ids"],
            "source_refs": payload["source_refs"],
            "tags": payload["tags"],
            "created_at": _now(),
        })
        _assert_mission_scope(context, candidate["mission_id"])
        _assert_evidence(repo_root, context, candidate["evidence_ids"])
        material_path = context.materials_root / f"{material_id}.json"
        if context.materials_root.is_symlink():
            raise LearningLibraryError("Project materials directory must not be a symbolic link")
        context.materials_root.mkdir(parents=True, exist_ok=True)
        if material_path.exists() or material_path.is_symlink():
            existing = _validate_material(
                _read_object(material_path, "LearningMaterial"),
                expected_workspace_id=context.workspace_id,
                expected_project_id=context.project_id,
            )
            comparable = set(RECORD_FIELDS) - {"created_at"}
            if all(existing[field] == candidate[field] for field in comparable):
                return existing
            raise LearningLibraryError("an immutable LearningMaterial with this id already exists")
        _write_json_atomic(material_path, candidate)
    return candidate


def list_materials(repo_root: Path) -> list[dict[str, Any]]:
    context = _context(repo_root.resolve())
    materials_root = context.materials_root
    if materials_root.is_symlink():
        raise LearningLibraryError("Project materials directory must not be a symbolic link")
    if not materials_root.is_dir():
        return []
    paths = sorted(materials_root.glob("*.json"))
    if len(paths) > MAX_MATERIALS:
        raise LearningLibraryError(f"Learning Library exceeds {MAX_MATERIALS} materials")
    materials = [
        _validate_material(
            _read_object(path, "LearningMaterial"),
            expected_workspace_id=context.workspace_id,
            expected_project_id=context.project_id,
        )
        for path in paths
    ]
    for material in materials:
        _assert_mission_scope(context, material["mission_id"])
    return sorted(materials, key=lambda item: (item["created_at"], item["id"]), reverse=True)
