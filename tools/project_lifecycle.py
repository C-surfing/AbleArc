#!/usr/bin/env python3
"""Atomic write lifecycle for workspace-v0.2 Projects.

The read resolver stays in project_store.py. This module owns the smaller
mutation boundary: create, select, pause, resume, archive, and maintenance
transitions. Archived Project content is never deleted.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

try:
    from tools import project_store
    from tools import runtime as learning_runtime
except ImportError:  # Direct execution from tools/
    import project_store
    import runtime as learning_runtime


class ProjectLifecycleError(RuntimeError):
    """A requested Project transition is invalid or could not finish safely."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _single_line(value: str, field: str, maximum: int) -> str:
    normalized = " ".join(value.split())
    if not normalized:
        raise ProjectLifecycleError(f"{field} cannot be empty")
    if len(normalized) > maximum:
        raise ProjectLifecycleError(f"{field} must be at most {maximum} characters")
    return normalized


def _portable_id(value: str, prefix: str) -> str:
    pieces: list[str] = []
    pending_dash = False
    for char in value.strip().lower():
        if char.isascii() and char.isalnum():
            if pending_dash and pieces:
                pieces.append("-")
            pieces.append(char)
            pending_dash = False
        else:
            pending_dash = True
    candidate = "".join(pieces).strip("-")[:64].rstrip("-")
    if not candidate:
        digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:10]
        candidate = f"{prefix}-{digest}"
    try:
        return project_store.validate_local_id(candidate, f"{prefix}_id")
    except project_store.ProjectStoreError as exc:
        raise ProjectLifecycleError(str(exc)) from exc


def _read_object(path: Path, label: str) -> dict:
    if path.is_symlink():
        raise ProjectLifecycleError(f"{label} must not be a symbolic link: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ProjectLifecycleError(f"cannot read valid {label}: {path}") from exc
    if not isinstance(value, dict):
        raise ProjectLifecycleError(f"{label} must be a JSON object")
    return value


def _write_json_atomic(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def _write_bytes_atomic(path: Path, value: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temporary.write_bytes(value)
    temporary.replace(path)


@contextmanager
def _lifecycle_lock(learning_root: Path) -> Iterator[None]:
    if learning_root.is_symlink():
        raise ProjectLifecycleError(".learning must not be a symbolic link")
    learning_root.mkdir(parents=True, exist_ok=True)
    lock = learning_root / ".project-lifecycle.lock"
    try:
        handle = lock.open("x", encoding="utf-8")
    except FileExistsError as exc:
        raise ProjectLifecycleError(
            "another Project lifecycle operation is already in progress"
        ) from exc
    try:
        handle.write(f"{uuid.uuid4().hex}\n")
        handle.close()
        yield
    finally:
        try:
            lock.unlink()
        except FileNotFoundError:
            pass


def _require_workspace(repo_root: Path) -> tuple[Path, Path, dict]:
    if project_store.detect_layout(repo_root) != project_store.LAYOUT_WORKSPACE:
        raise ProjectLifecycleError(
            "workspace-v0.2 is required; migrate legacy state or create the first Project"
        )
    learning_root = repo_root.resolve() / ".learning"
    workspace_path = learning_root / "workspace.json"
    try:
        workspace = project_store.load_workspace_manifest(repo_root)
    except project_store.ProjectStoreError as exc:
        raise ProjectLifecycleError(str(exc)) from exc
    return learning_root, workspace_path, workspace


def _project_data(
    repo_root: Path,
    project_id: str,
) -> tuple[project_store.ProjectContext, dict]:
    try:
        safe_id = project_store.validate_local_id(project_id, "project_id")
        context = project_store.resolve_project_context(repo_root, project_id=safe_id)
    except project_store.ProjectStoreError as exc:
        raise ProjectLifecycleError(str(exc)) from exc
    assert context.project_manifest_path is not None
    return context, _read_object(context.project_manifest_path, "project manifest")


def _mission_markdown(goal: str, why: str, source: str, created_at: str) -> str:
    why_text = why or "<!-- Not provided. Clarify only if it changes the learning route. -->"
    return (
        "# Learning Mission\n\n"
        f"- Goal: {goal}\n"
        f"- Source: {source}\n"
        f"- Created at: {created_at}\n\n"
        "## Why this matters\n\n"
        f"{why_text}\n\n"
        "## Success looks like\n\n"
        "<!-- Establish observable completion criteria from the Mission and evidence. -->\n\n"
        "- [ ] To be established from the first diagnostic evidence.\n\n"
        "## Current direction\n\n"
        "Start from real learner evidence; revise the route without redefining the goal.\n"
    )


def _initialize_project_runtime(project_root: Path) -> None:
    runtime_root = project_root / "runtime"
    for directory in learning_runtime.RECEIPT_DIRS.values():
        (runtime_root / "receipts" / directory).mkdir(parents=True, exist_ok=True)
    _write_json_atomic(
        runtime_root / "manifest.json",
        {
            "schema_version": learning_runtime.SCHEMA_VERSION,
            "authority_model": "proposal-plus-explicit-decision",
            "state_projection": "state.json",
            "receipts": learning_runtime.RECEIPT_DIRS,
        },
    )
    _write_json_atomic(
        runtime_root / "state.json",
        {
            "schema_version": learning_runtime.SCHEMA_VERSION,
            "revision": 0,
            "updated_at": None,
            "concepts": {},
        },
    )


def create_project(
    repo_root: Path,
    *,
    title: str,
    goal: str,
    why: str = "",
    project_id: str | None = None,
    mission_id: str | None = None,
    source: str = "learner-explicit",
) -> dict:
    """Create one Project with an initial Mission and atomically select it."""
    repo_root = repo_root.resolve()
    layout = project_store.detect_layout(repo_root)
    if layout == project_store.LAYOUT_LEGACY:
        raise ProjectLifecycleError(
            "legacy-v0.1 state must be migrated before creating another Project"
        )
    title = _single_line(title, "project title", 200)
    goal = _single_line(goal, "mission goal", 1200)
    why = " ".join(why.split())
    if len(why) > 2400:
        raise ProjectLifecycleError("mission why must be at most 2400 characters")
    if source not in ("learner-explicit", "agent-assisted", "imported"):
        raise ProjectLifecycleError("mission source is invalid")
    try:
        selected_project_id = (
            project_store.validate_local_id(project_id, "project_id")
            if project_id
            else _portable_id(title, "project")
        )
        selected_mission_id = (
            project_store.validate_local_id(mission_id, "mission_id")
            if mission_id
            else "primary-mission"
        )
    except project_store.ProjectStoreError as exc:
        raise ProjectLifecycleError(str(exc)) from exc

    learning_root = repo_root / ".learning"
    with _lifecycle_lock(learning_root):
        workspace_path = learning_root / "workspace.json"
        original_workspace = workspace_path.read_bytes() if workspace_path.is_file() else None
        timestamp = _now()
        if layout == project_store.LAYOUT_WORKSPACE:
            try:
                workspace = project_store.load_workspace_manifest(repo_root)
            except project_store.ProjectStoreError as exc:
                raise ProjectLifecycleError(str(exc)) from exc
        else:
            workspace = {
                "schema_version": "0.2",
                "id": f"ws_{uuid.uuid4().hex[:16]}",
                "active_project_id": None,
                "onboarding": {"intro_seen": False},
                "created_at": timestamp,
                "updated_at": timestamp,
            }

        projects_root = learning_root / "projects"
        if projects_root.is_symlink():
            raise ProjectLifecycleError("projects root must not be a symbolic link")
        projects_root.mkdir(parents=True, exist_ok=True)
        target = projects_root / selected_project_id
        if target.exists() or target.is_symlink():
            raise ProjectLifecycleError(f"Project already exists: {selected_project_id}")
        operation_id = f"create_{uuid.uuid4().hex[:16]}"
        staging = projects_root / f".creating-{operation_id}"
        failed = learning_root / "lifecycle" / "failed" / operation_id
        learner_created = False

        try:
            mission_root = staging / "missions" / selected_mission_id
            mission_root.mkdir(parents=True)
            for directory in (
                staging / "map",
                staging / "materials",
                staging / "records",
                staging / "references",
                staging / "artifacts",
            ):
                directory.mkdir(parents=True, exist_ok=True)

            templates = repo_root / "templates"
            for template_name, destination in (
                ("ROADMAP.md", staging / "map" / "ROADMAP.md"),
                ("STATE.md", staging / "STATE.md"),
            ):
                source_path = templates / template_name
                if not source_path.is_file():
                    raise ProjectLifecycleError(f"missing template: {source_path}")
                shutil.copyfile(source_path, destination)
            (mission_root / "MISSION.md").write_text(
                _mission_markdown(goal, why, source, timestamp),
                encoding="utf-8",
            )
            _write_json_atomic(
                mission_root / "mission.json",
                {
                    "schema_version": "0.2",
                    "id": selected_mission_id,
                    "project_id": selected_project_id,
                    "status": "active",
                    "goal": goal,
                    "why": why,
                    "source": source,
                    "criteria": [],
                    "created_at": timestamp,
                    "updated_at": timestamp,
                },
            )
            _write_json_atomic(
                staging / "project.json",
                {
                    "schema_version": "0.2",
                    "id": selected_project_id,
                    "title": title,
                    "status": "active",
                    "active_mission_id": selected_mission_id,
                    "maintenance_status": "none",
                    "created_at": timestamp,
                    "updated_at": timestamp,
                    "archived_at": None,
                },
            )
            _initialize_project_runtime(staging)
            staging.replace(target)

            learner_path = learning_root / "LEARNER.md"
            if learner_path.is_symlink():
                raise ProjectLifecycleError(
                    "shared LEARNER.md must not be a symbolic link"
                )
            if not learner_path.exists():
                learner_template = repo_root / "templates" / "LEARNER.md"
                if not learner_template.is_file():
                    raise ProjectLifecycleError(f"missing template: {learner_template}")
                shutil.copyfile(learner_template, learner_path)
                learner_created = True
            workspace["active_project_id"] = selected_project_id
            workspace["updated_at"] = timestamp
            _write_json_atomic(workspace_path, workspace)

            context = project_store.resolve_project_context(repo_root)
            if (
                context.project_id != selected_project_id
                or context.mission_id != selected_mission_id
            ):
                raise ProjectLifecycleError("created Project did not become the active context")
            decision = learning_runtime.bootstrap_mission_decision(repo_root, goal)
            problems = learning_runtime.verify_runtime(repo_root)
            if problems:
                raise ProjectLifecycleError(
                    "created Project runtime is invalid: " + "; ".join(problems)
                )
            return {
                "status": "created",
                "workspace_id": context.workspace_id,
                "project_id": selected_project_id,
                "mission_id": selected_mission_id,
                "title": title,
                "goal": goal,
                "decision_id": decision["id"],
            }
        except Exception as exc:
            failed.mkdir(parents=True, exist_ok=True)
            if workspace_path.exists():
                if original_workspace is None:
                    workspace_path.replace(failed / "workspace.json")
                else:
                    _write_bytes_atomic(workspace_path, original_workspace)
            if original_workspace is None and learner_created and learner_path.exists():
                learner_path.replace(failed / "LEARNER.md")
            if target.exists():
                target.replace(failed / selected_project_id)
            elif staging.exists():
                staging.replace(failed / selected_project_id)
            if isinstance(exc, ProjectLifecycleError):
                raise
            raise ProjectLifecycleError(f"Project creation failed safely: {exc}") from exc


def list_projects(repo_root: Path) -> list[dict]:
    learning_root, _, workspace = _require_workspace(repo_root)
    projects_root = learning_root / "projects"
    if projects_root.is_symlink():
        raise ProjectLifecycleError("projects root must not be a symbolic link")
    projects: list[dict] = []
    for child in projects_root.iterdir() if projects_root.is_dir() else []:
        if not child.is_dir() or child.name.startswith("."):
            continue
        try:
            context, manifest = _project_data(repo_root, child.name)
        except ProjectLifecycleError as exc:
            raise ProjectLifecycleError(f"invalid Project {child.name}: {exc}") from exc
        projects.append(
            {
                "id": context.project_id,
                "title": manifest["title"],
                "status": context.project_status,
                "maintenance_status": context.maintenance_status,
                "active_mission_id": context.mission_id,
                "selected": workspace.get("active_project_id") == context.project_id,
                "updated_at": manifest["updated_at"],
                "archived_at": manifest["archived_at"],
            }
        )
    return sorted(
        projects,
        key=lambda item: (
            not item["selected"],
            item["status"] == "archived",
            item["title"].lower(),
        ),
    )


def learning_brief(repo_root: Path) -> dict:
    """Return a short, read-only session brief from persisted learning state."""
    repo_root = repo_root.resolve()
    layout = project_store.detect_layout(repo_root)
    if layout == project_store.LAYOUT_UNINITIALIZED:
        return {
            "status": "uninitialized",
            "headline": "No learning Project exists yet.",
            "detail": "Create one Project from an observable capability goal.",
            "next_action": "create-project",
            "project_count": 0,
            "due_review_count": 0,
        }

    try:
        context = project_store.resolve_project_context(repo_root)
    except project_store.ProjectStoreError as exc:
        raise ProjectLifecycleError(str(exc)) from exc

    if layout == project_store.LAYOUT_WORKSPACE:
        projects = list_projects(repo_root)
        _, project = _project_data(repo_root, context.project_id)
        title = project["title"]
    else:
        projects = [
            {
                "id": context.project_id,
                "status": "active",
                "maintenance_status": "none",
            }
        ]
        title = "Legacy learning workspace"

    due_review_count = sum(
        item["maintenance_status"] == "due" for item in projects
    )
    pending = learning_runtime.pending_learner_turn(repo_root)
    decisions = learning_runtime.list_receipts(repo_root, "decision")
    latest_decision = decisions[-1] if decisions else None

    if context.project_status == "paused":
        headline = f"{title} is paused."
        detail = "Its state is readable, but new evidence is blocked."
        next_action = "resume-project"
    elif (
        context.project_status == "archived"
        and context.maintenance_status == "study_active"
    ):
        headline = f"Maintenance review is active for {title}."
        detail = "Use one short retrieval or transfer check, then record the result."
        next_action = "continue-maintenance"
    elif context.project_status == "archived":
        headline = f"{title} is archived and retained."
        detail = (
            "A maintenance retrieval is due."
            if context.maintenance_status == "due"
            else "The main learning line is complete; future maintenance remains available."
        )
        next_action = (
            "maintenance-start"
            if context.maintenance_status == "due"
            else "wait-for-maintenance"
        )
    elif pending:
        headline = "The learner's latest response is ready for assessment."
        detail = "Assess it before asking the learner to repeat the attempt."
        next_action = "runtime-pending"
    elif latest_decision:
        target = str(latest_decision.get("target") or "the current frontier")
        learner_action = str(
            latest_decision.get("learner_action")
            or "Continue with the next evidence-bearing move."
        )
        headline = f"Continue {title} at {target}."
        detail = learner_action
        next_action = "continue-current-decision"
    else:
        headline = f"Continue {title} from its retained state."
        detail = "Locate one current frontier before choosing the next learning move."
        next_action = "orient"

    return {
        "status": "ready",
        "project_id": context.project_id,
        "project_title": title,
        "project_status": context.project_status,
        "maintenance_status": context.maintenance_status,
        "mission_id": context.mission_id,
        "project_count": len(projects),
        "due_review_count": due_review_count,
        "headline": headline,
        "detail": detail,
        "next_action": next_action,
        "pending_observation_id": (
            pending["observation"]["id"] if pending else None
        ),
        "decision_id": latest_decision.get("id") if latest_decision else None,
    }


def _select(repo_root: Path, project_id: str, *, allow_archived: bool = False) -> dict:
    _, workspace_path, workspace = _require_workspace(repo_root)
    original_workspace = workspace_path.read_bytes()
    context, manifest = _project_data(repo_root, project_id)
    if context.project_status == "archived" and not (
        allow_archived and context.maintenance_status == "study_active"
    ):
        raise ProjectLifecycleError(
            "archived Project can only become active through maintenance-start"
        )
    workspace["active_project_id"] = context.project_id
    workspace["updated_at"] = _now()
    try:
        _write_json_atomic(workspace_path, workspace)
        selected = project_store.resolve_project_context(repo_root)
        if selected.project_id != context.project_id:
            raise ProjectLifecycleError("workspace did not select the requested Project")
    except Exception:
        _write_bytes_atomic(workspace_path, original_workspace)
        raise
    return {
        "status": "selected",
        "project_id": context.project_id,
        "project_status": manifest["status"],
        "mission_id": context.mission_id,
    }


def switch_project(repo_root: Path, project_id: str) -> dict:
    with _lifecycle_lock(repo_root.resolve() / ".learning"):
        context, _ = _project_data(repo_root, project_id)
        return _select(
            repo_root,
            project_id,
            allow_archived=(
                context.project_status == "archived"
                and context.maintenance_status == "study_active"
            ),
        )


def _transition_project(
    repo_root: Path,
    project_id: str,
    *,
    allowed_statuses: tuple[str, ...],
    status: str,
    maintenance_status: str,
    select: bool,
) -> dict:
    _, workspace_path, workspace = _require_workspace(repo_root)
    context, project = _project_data(repo_root, project_id)
    if context.project_status not in allowed_statuses:
        allowed = ", ".join(allowed_statuses)
        raise ProjectLifecycleError(
            f"Project {project_id} must be {allowed}; current status is {context.project_status}"
        )
    timestamp = _now()
    assert context.project_manifest_path is not None
    original_project = context.project_manifest_path.read_bytes()
    original_workspace = workspace_path.read_bytes()
    project["status"] = status
    project["maintenance_status"] = maintenance_status
    project["updated_at"] = timestamp
    project["archived_at"] = timestamp if status == "archived" else None
    try:
        _write_json_atomic(context.project_manifest_path, project)
        if select:
            workspace["active_project_id"] = context.project_id
            workspace["updated_at"] = timestamp
            _write_json_atomic(workspace_path, workspace)
        updated = project_store.resolve_project_context(
            repo_root,
            project_id=context.project_id,
        )
        if updated.project_status != status:
            raise ProjectLifecycleError("Project transition did not persist")
    except Exception:
        _write_bytes_atomic(context.project_manifest_path, original_project)
        _write_bytes_atomic(workspace_path, original_workspace)
        raise
    return {
        "status": status,
        "project_id": context.project_id,
        "maintenance_status": maintenance_status,
        "selected": workspace.get("active_project_id") == context.project_id,
    }


def pause_project(repo_root: Path, project_id: str) -> dict:
    with _lifecycle_lock(repo_root.resolve() / ".learning"):
        return _transition_project(
            repo_root,
            project_id,
            allowed_statuses=("active",),
            status="paused",
            maintenance_status="none",
            select=False,
        )


def resume_project(repo_root: Path, project_id: str) -> dict:
    with _lifecycle_lock(repo_root.resolve() / ".learning"):
        return _transition_project(
            repo_root,
            project_id,
            allowed_statuses=("paused",),
            status="active",
            maintenance_status="none",
            select=True,
        )


def archive_project(repo_root: Path, project_id: str) -> dict:
    with _lifecycle_lock(repo_root.resolve() / ".learning"):
        return _transition_project(
            repo_root,
            project_id,
            allowed_statuses=("active", "paused"),
            status="archived",
            maintenance_status="scheduled",
            select=False,
        )


def maintenance_start(repo_root: Path, project_id: str) -> dict:
    learning_root = repo_root.resolve() / ".learning"
    with _lifecycle_lock(learning_root):
        _, workspace_path, _ = _require_workspace(repo_root)
        context, project = _project_data(repo_root, project_id)
        if context.project_status != "archived":
            raise ProjectLifecycleError("maintenance study is only for archived Projects")
        if context.maintenance_status == "study_active":
            raise ProjectLifecycleError("maintenance study is already active")
        if context.mission_id is None:
            raise ProjectLifecycleError("maintenance study requires a retained Mission")
        project["maintenance_status"] = "study_active"
        project["updated_at"] = _now()
        assert context.project_manifest_path is not None
        original_project = context.project_manifest_path.read_bytes()
        original_workspace = workspace_path.read_bytes()
        try:
            _write_json_atomic(context.project_manifest_path, project)
            result = _select(repo_root, project_id, allow_archived=True)
        except Exception:
            _write_bytes_atomic(context.project_manifest_path, original_project)
            _write_bytes_atomic(workspace_path, original_workspace)
            raise
        result["status"] = "maintenance_active"
        result["maintenance_status"] = "study_active"
        return result


def maintenance_finish(repo_root: Path, project_id: str, outcome: str) -> dict:
    if outcome not in ("retention_confirmed", "needs_study"):
        raise ProjectLifecycleError(
            "maintenance outcome must be retention_confirmed or needs_study"
        )
    learning_root = repo_root.resolve() / ".learning"
    with _lifecycle_lock(learning_root):
        context, project = _project_data(repo_root, project_id)
        if (
            context.project_status != "archived"
            or context.maintenance_status != "study_active"
        ):
            raise ProjectLifecycleError("Project does not have an active maintenance study")
        next_status = "scheduled" if outcome == "retention_confirmed" else "due"
        project["maintenance_status"] = next_status
        project["updated_at"] = _now()
        assert context.project_manifest_path is not None
        _write_json_atomic(context.project_manifest_path, project)
        return {
            "status": "maintenance_finished",
            "project_id": context.project_id,
            "outcome": outcome,
            "maintenance_status": next_status,
            "project_status": "archived",
        }


def maintenance_due(repo_root: Path, project_id: str) -> dict:
    learning_root = repo_root.resolve() / ".learning"
    with _lifecycle_lock(learning_root):
        context, project = _project_data(repo_root, project_id)
        if (
            context.project_status != "archived"
            or context.maintenance_status not in ("none", "scheduled")
        ):
            raise ProjectLifecycleError(
                "only an archived scheduled Project can become due for maintenance"
            )
        project["maintenance_status"] = "due"
        project["updated_at"] = _now()
        assert context.project_manifest_path is not None
        _write_json_atomic(context.project_manifest_path, project)
        return {
            "status": "maintenance_due",
            "project_id": context.project_id,
            "project_status": "archived",
            "maintenance_status": "due",
        }
