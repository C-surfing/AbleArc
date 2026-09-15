#!/usr/bin/env python3
"""Read-only storage discovery for legacy and project-scoped learning state.

This module centralizes path selection before the runtime becomes project-aware.
It deliberately does not create or migrate data. The v0.1 root layout remains
readable, while a v0.2 workspace manifest acts as the atomic switch to canonical
Workspace/Project/Mission paths.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal


LAYOUT_UNINITIALIZED = "uninitialized"
LAYOUT_LEGACY = "legacy-v0.1"
LAYOUT_WORKSPACE = "workspace-v0.2"
Layout = Literal["uninitialized", "legacy-v0.1", "workspace-v0.2"]

WORKSPACE_SCHEMA_VERSION = "0.2"
LEGACY_PROJECT_ID = "legacy-v0-1"
LEGACY_MISSION_ID = "legacy-mission"
LOCAL_ID_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
WORKSPACE_ID_PATTERN = re.compile(r"^ws_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$")
EVIDENCE_ID_PATTERN = re.compile(r"^ev_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$")
LEGACY_MARKERS = (
    "MISSION.md",
    "LEARNER.md",
    "ROADMAP.md",
    "STATE.md",
    "runtime",
    "artifacts",
)


class ProjectStoreError(RuntimeError):
    """A storage layout or manifest cannot be resolved safely."""


@dataclass(frozen=True)
class ProjectContext:
    """Resolved read paths for one project and its optional active mission."""

    layout: Layout
    workspace_id: str | None
    project_id: str
    mission_id: str | None
    learning_root: Path
    learner_path: Path
    project_root: Path
    project_manifest_path: Path | None
    mission_root: Path | None
    mission_manifest_path: Path | None
    mission_markdown_path: Path | None
    learning_map_path: Path | None
    roadmap_markdown_path: Path
    state_path: Path
    misconceptions_path: Path | None
    reviews_path: Path | None
    materials_root: Path
    records_root: Path
    references_root: Path
    artifacts_root: Path
    runtime_root: Path


def _read_object(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ProjectStoreError(f"cannot read {label}: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ProjectStoreError(f"invalid JSON in {label}: {path}") from exc
    if not isinstance(value, dict):
        raise ProjectStoreError(f"{label} must be a JSON object: {path}")
    return value


def _required_string(data: dict[str, Any], field: str, label: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ProjectStoreError(f"{label} {field} must be a non-empty string")
    return value.strip()


def _local_id(value: Any, field: str, *, optional: bool = False) -> str | None:
    if value is None and optional:
        return None
    if not isinstance(value, str) or not LOCAL_ID_PATTERN.fullmatch(value):
        raise ProjectStoreError(
            f"{field} must contain lowercase letters, numbers, and non-edge hyphens"
        )
    return value


def validate_local_id(value: str, field: str = "id") -> str:
    """Validate a caller-supplied Project/Mission ID without touching storage."""
    result = _local_id(value, field)
    assert result is not None
    return result


def detect_layout(repo_root: Path) -> Layout:
    """Return the active storage layout without mutating the workspace."""
    learning_root = repo_root.resolve() / ".learning"
    if (learning_root / "workspace.json").is_file():
        return LAYOUT_WORKSPACE
    if learning_root.is_dir() and any((learning_root / name).exists() for name in LEGACY_MARKERS):
        return LAYOUT_LEGACY
    return LAYOUT_UNINITIALIZED


def _legacy_context(repo_root: Path, project_id: str | None, mission_id: str | None) -> ProjectContext:
    if project_id not in (None, LEGACY_PROJECT_ID):
        raise ProjectStoreError(
            f"legacy workspace exposes only project_id {LEGACY_PROJECT_ID}"
        )
    if mission_id not in (None, LEGACY_MISSION_ID):
        raise ProjectStoreError(
            f"legacy workspace exposes only mission_id {LEGACY_MISSION_ID}"
        )
    learning_root = repo_root / ".learning"
    mission_path = learning_root / "MISSION.md"
    return ProjectContext(
        layout=LAYOUT_LEGACY,
        workspace_id=None,
        project_id=LEGACY_PROJECT_ID,
        mission_id=LEGACY_MISSION_ID if mission_path.is_file() else None,
        learning_root=learning_root,
        learner_path=learning_root / "LEARNER.md",
        project_root=learning_root,
        project_manifest_path=None,
        mission_root=learning_root if mission_path.is_file() else None,
        mission_manifest_path=None,
        mission_markdown_path=mission_path if mission_path.is_file() else None,
        learning_map_path=None,
        roadmap_markdown_path=learning_root / "ROADMAP.md",
        state_path=learning_root / "STATE.md",
        misconceptions_path=None,
        reviews_path=None,
        materials_root=learning_root / "references",
        records_root=learning_root / "records",
        references_root=learning_root / "references",
        artifacts_root=learning_root / "artifacts",
        runtime_root=learning_root / "runtime",
    )


def _validate_workspace(data: dict[str, Any]) -> tuple[str, str | None]:
    if data.get("schema_version") != WORKSPACE_SCHEMA_VERSION:
        raise ProjectStoreError("workspace manifest schema_version must be 0.2")
    workspace_id = _required_string(data, "id", "workspace manifest")
    if not WORKSPACE_ID_PATTERN.fullmatch(workspace_id):
        raise ProjectStoreError("workspace manifest id is invalid")
    active_project_id = _local_id(
        data.get("active_project_id"), "active_project_id", optional=True
    )
    onboarding = data.get("onboarding")
    if not isinstance(onboarding, dict) or not isinstance(onboarding.get("intro_seen"), bool):
        raise ProjectStoreError("workspace manifest onboarding.intro_seen must be a boolean")
    _required_string(data, "created_at", "workspace manifest")
    _required_string(data, "updated_at", "workspace manifest")
    return workspace_id, active_project_id


def _validate_project(data: dict[str, Any], expected_id: str) -> str | None:
    if data.get("schema_version") != WORKSPACE_SCHEMA_VERSION:
        raise ProjectStoreError("project manifest schema_version must be 0.2")
    if data.get("id") != expected_id:
        raise ProjectStoreError("project manifest id does not match its directory")
    _required_string(data, "title", "project manifest")
    if data.get("status") not in ("active", "paused", "archived"):
        raise ProjectStoreError("project manifest status is invalid")
    if data.get("maintenance_status") not in ("none", "scheduled", "due", "study_active"):
        raise ProjectStoreError("project manifest maintenance_status is invalid")
    _required_string(data, "created_at", "project manifest")
    _required_string(data, "updated_at", "project manifest")
    archived_at = data.get("archived_at")
    if archived_at is not None and (not isinstance(archived_at, str) or not archived_at.strip()):
        raise ProjectStoreError("project manifest archived_at must be null or a timestamp")
    return _local_id(data.get("active_mission_id"), "active_mission_id", optional=True)


def _validate_mission(data: dict[str, Any], project_id: str, mission_id: str) -> None:
    if data.get("schema_version") != WORKSPACE_SCHEMA_VERSION:
        raise ProjectStoreError("mission manifest schema_version must be 0.2")
    if data.get("id") != mission_id:
        raise ProjectStoreError("mission manifest id does not match its directory")
    if data.get("project_id") != project_id:
        raise ProjectStoreError("mission manifest project_id does not match its project")
    if data.get("status") not in ("planned", "active", "completed", "superseded"):
        raise ProjectStoreError("mission manifest status is invalid")
    _required_string(data, "goal", "mission manifest")
    if not isinstance(data.get("why"), str):
        raise ProjectStoreError("mission manifest why must be a string")
    if data.get("source") not in ("learner-explicit", "agent-assisted", "imported"):
        raise ProjectStoreError("mission manifest source is invalid")
    criteria = data.get("criteria")
    if not isinstance(criteria, list):
        raise ProjectStoreError("mission manifest criteria must be a list")
    criterion_ids: set[str] = set()
    for criterion in criteria:
        if not isinstance(criterion, dict):
            raise ProjectStoreError("each mission criterion must be an object")
        criterion_id = _local_id(criterion.get("id"), "criterion id")
        assert criterion_id is not None
        if criterion_id in criterion_ids:
            raise ProjectStoreError("mission criterion ids must be unique")
        criterion_ids.add(criterion_id)
        _required_string(criterion, "capability", "mission criterion")
        if not isinstance(criterion.get("required"), bool):
            raise ProjectStoreError("mission criterion required must be a boolean")
        evidence_ids = criterion.get("evidence_ids")
        if (
            not isinstance(evidence_ids, list)
            or any(not isinstance(item, str) or not EVIDENCE_ID_PATTERN.fullmatch(item) for item in evidence_ids)
            or len(set(evidence_ids)) != len(evidence_ids)
        ):
            raise ProjectStoreError("mission criterion evidence_ids must be unique runtime evidence ids")
    _required_string(data, "created_at", "mission manifest")
    _required_string(data, "updated_at", "mission manifest")


def resolve_project_context(
    repo_root: Path,
    project_id: str | None = None,
    mission_id: str | None = None,
) -> ProjectContext:
    """Resolve canonical read paths without creating, moving, or rewriting data."""
    repo_root = repo_root.resolve()
    layout = detect_layout(repo_root)
    if layout == LAYOUT_UNINITIALIZED:
        raise ProjectStoreError("learning workspace is not initialized")
    if layout == LAYOUT_LEGACY:
        return _legacy_context(repo_root, project_id, mission_id)

    learning_root = repo_root / ".learning"
    workspace_path = learning_root / "workspace.json"
    workspace = _read_object(workspace_path, "workspace manifest")
    workspace_id, active_project_id = _validate_workspace(workspace)
    selected_project_id = _local_id(
        project_id if project_id is not None else active_project_id,
        "project_id",
    )
    assert selected_project_id is not None

    project_root = learning_root / "projects" / selected_project_id
    project_manifest_path = project_root / "project.json"
    project = _read_object(project_manifest_path, "project manifest")
    active_mission_id = _validate_project(project, selected_project_id)
    selected_mission_id = _local_id(
        mission_id if mission_id is not None else active_mission_id,
        "mission_id",
        optional=True,
    )

    mission_root: Path | None = None
    mission_manifest_path: Path | None = None
    mission_markdown_path: Path | None = None
    if selected_mission_id is not None:
        mission_root = project_root / "missions" / selected_mission_id
        mission_manifest_path = mission_root / "mission.json"
        mission = _read_object(mission_manifest_path, "mission manifest")
        _validate_mission(mission, selected_project_id, selected_mission_id)
        candidate = mission_root / "MISSION.md"
        mission_markdown_path = candidate if candidate.is_file() else None

    return ProjectContext(
        layout=LAYOUT_WORKSPACE,
        workspace_id=workspace_id,
        project_id=selected_project_id,
        mission_id=selected_mission_id,
        learning_root=learning_root,
        learner_path=learning_root / "LEARNER.md",
        project_root=project_root,
        project_manifest_path=project_manifest_path,
        mission_root=mission_root,
        mission_manifest_path=mission_manifest_path,
        mission_markdown_path=mission_markdown_path,
        learning_map_path=project_root / "map" / "current.json",
        roadmap_markdown_path=project_root / "map" / "ROADMAP.md",
        state_path=project_root / "STATE.md",
        misconceptions_path=project_root / "misconceptions.json",
        reviews_path=project_root / "reviews.json",
        materials_root=project_root / "materials",
        records_root=project_root / "records",
        references_root=project_root / "references",
        artifacts_root=project_root / "artifacts",
        runtime_root=project_root / "runtime",
    )
