#!/usr/bin/env python3
"""Evidence-gated Mission completion and retained Project archival.

Completion criteria are configured on the Mission manifest. Runtime Evidence
remains the observation/assessment authority; this module only evaluates cited
receipts against deterministic thresholds and records an immutable decision.
"""

from __future__ import annotations

import json
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
LEVEL_RANK = {value: index for index, value in enumerate(project_store.EVIDENCE_LEVELS)}
SCAFFOLDING_RANK = {value: index for index, value in enumerate(project_store.SCAFFOLDING_LEVELS)}
CONTEXT_RANK = {value: index for index, value in enumerate(project_store.EVIDENCE_CONTEXTS)}
DELAY_RANK = {value: index for index, value in enumerate(project_store.EVIDENCE_DELAYS)}
INDEPENDENCE_RANK = {value: index for index, value in enumerate(project_store.EVIDENCE_INDEPENDENCE)}
CRITERION_FIELDS = {
    "id", "capability", "kind", "required", "minimum_level",
    "max_scaffolding", "minimum_context", "minimum_delay",
    "minimum_independence", "minimum_evidence", "evidence_ids",
}
PERFORMANCE_KINDS = {"performance", "application", "transfer"}


class CompletionGateError(RuntimeError):
    """Completion criteria or transition failed a deterministic guardrail."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _read_object(path: Path, label: str) -> dict[str, Any]:
    if path.is_symlink():
        raise CompletionGateError(f"{label} must not be a symbolic link: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CompletionGateError(f"cannot read valid {label}: {path}") from exc
    if not isinstance(value, dict):
        raise CompletionGateError(f"{label} must be a JSON object")
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


def _write_text_atomic(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(value, encoding="utf-8")
        temporary.replace(path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _write_bytes_atomic(path: Path, value: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_bytes(value)
        temporary.replace(path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


@contextmanager
def _lifecycle_lock(learning_root: Path) -> Iterator[None]:
    if learning_root.is_symlink():
        raise CompletionGateError(".learning must not be a symbolic link")
    lock = learning_root / ".project-lifecycle.lock"
    try:
        handle = lock.open("x", encoding="utf-8")
    except FileExistsError as exc:
        raise CompletionGateError("another Project lifecycle operation is already in progress") from exc
    try:
        handle.write(f"{uuid.uuid4().hex}\n")
        handle.close()
        yield
    finally:
        lock.unlink(missing_ok=True)


def _text(value: Any, label: str, maximum: int) -> str:
    if not isinstance(value, str):
        raise CompletionGateError(f"{label} must be a string")
    normalized = " ".join(value.split())
    if not normalized or len(normalized) > maximum:
        raise CompletionGateError(f"{label} must be 1-{maximum} characters")
    return normalized


def _evidence_ids(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or len(value) > 30:
        raise CompletionGateError(f"{label} must be a list with at most 30 items")
    if any(
        not isinstance(item, str) or not project_store.EVIDENCE_ID_PATTERN.fullmatch(item)
        for item in value
    ):
        raise CompletionGateError(f"{label} must contain Runtime Evidence identifiers")
    if len(set(value)) != len(value):
        raise CompletionGateError(f"{label} must not contain duplicates")
    return value


def _criterion(value: Any, index: int) -> dict[str, Any]:
    label = f"criteria[{index}]"
    if not isinstance(value, dict) or set(value) != CRITERION_FIELDS:
        raise CompletionGateError(f"{label} must contain the complete supported criterion fields")
    try:
        criterion_id = project_store.validate_local_id(value["id"], f"{label}.id")
    except project_store.ProjectStoreError as exc:
        raise CompletionGateError(str(exc)) from exc
    kind = value["kind"]
    if kind not in project_store.COMPLETION_KINDS:
        raise CompletionGateError(f"{label}.kind is invalid")
    if not isinstance(value["required"], bool):
        raise CompletionGateError(f"{label}.required must be a boolean")
    for field, choices in (
        ("minimum_level", project_store.EVIDENCE_LEVELS),
        ("max_scaffolding", project_store.SCAFFOLDING_LEVELS),
        ("minimum_context", project_store.EVIDENCE_CONTEXTS),
        ("minimum_delay", project_store.EVIDENCE_DELAYS),
        ("minimum_independence", project_store.EVIDENCE_INDEPENDENCE),
    ):
        if value[field] not in choices:
            raise CompletionGateError(f"{label}.{field} is invalid")
    minimum_evidence = value["minimum_evidence"]
    if (
        isinstance(minimum_evidence, bool)
        or not isinstance(minimum_evidence, int)
        or not 1 <= minimum_evidence <= 5
    ):
        raise CompletionGateError(f"{label}.minimum_evidence must be between 1 and 5")

    level = LEVEL_RANK[value["minimum_level"]]
    scaffold = SCAFFOLDING_RANK[value["max_scaffolding"]]
    context = CONTEXT_RANK[value["minimum_context"]]
    delay = DELAY_RANK[value["minimum_delay"]]
    independence = INDEPENDENCE_RANK[value["minimum_independence"]]
    if kind == "feynman" and (
        level < LEVEL_RANK["explanation"]
        or scaffold > SCAFFOLDING_RANK["light"]
        or independence < INDEPENDENCE_RANK["independent"]
    ):
        raise CompletionGateError(
            "Feynman criteria require explanation-level, independent Evidence with at most light scaffolding"
        )
    if kind in {"performance", "application"} and (
        level < LEVEL_RANK["application"]
        or scaffold > SCAFFOLDING_RANK["light"]
        or independence < INDEPENDENCE_RANK["independent"]
    ):
        raise CompletionGateError(
            f"{kind} criteria require application-level, independent Evidence with at most light scaffolding"
        )
    if kind == "transfer" and (
        level < LEVEL_RANK["transfer"]
        or context < CONTEXT_RANK["novel"]
        or independence < INDEPENDENCE_RANK["independent"]
    ):
        raise CompletionGateError("transfer criteria require independent transfer Evidence in a novel context")
    if kind == "retrieval" and (
        level < LEVEL_RANK["recall"]
        or delay < DELAY_RANK["delayed"]
        or independence < INDEPENDENCE_RANK["independent"]
    ):
        raise CompletionGateError("retrieval criteria require independent, delayed recall Evidence")
    return {
        "id": criterion_id,
        "capability": _text(value["capability"], f"{label}.capability", 500),
        "kind": kind,
        "required": value["required"],
        "minimum_level": value["minimum_level"],
        "max_scaffolding": value["max_scaffolding"],
        "minimum_context": value["minimum_context"],
        "minimum_delay": value["minimum_delay"],
        "minimum_independence": value["minimum_independence"],
        "minimum_evidence": minimum_evidence,
        "evidence_ids": _evidence_ids(value["evidence_ids"], f"{label}.evidence_ids"),
    }


def _criteria(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list) or not 2 <= len(value) <= 30:
        raise CompletionGateError("criteria must contain 2-30 completion criteria")
    result = [_criterion(item, index) for index, item in enumerate(value)]
    ids = [item["id"] for item in result]
    if len(set(ids)) != len(ids):
        raise CompletionGateError("completion criterion ids must be unique")
    required = [item for item in result if item["required"]]
    if not any(item["kind"] == "feynman" for item in required):
        raise CompletionGateError("completion requires a required Feynman reconstruction criterion")
    if not any(item["kind"] in PERFORMANCE_KINDS for item in required):
        raise CompletionGateError("completion requires a required independent performance criterion")
    return result


def _context(repo_root: Path) -> project_store.ProjectContext:
    try:
        context = project_store.resolve_project_context(repo_root.resolve())
    except project_store.ProjectStoreError as exc:
        raise CompletionGateError(str(exc)) from exc
    if (
        context.layout != project_store.LAYOUT_WORKSPACE
        or context.mission_manifest_path is None
        or context.mission_markdown_path is None
        or context.mission_root is None
        or context.project_manifest_path is None
        or context.workspace_id is None
        or context.mission_id is None
    ):
        raise CompletionGateError("Mission Completion Gate requires an active workspace-v0.2 Project and Mission")
    return context


def _mission_projection(mission: dict[str, Any]) -> str:
    criteria = mission.get("criteria") or []
    criterion_lines = []
    for item in criteria:
        marker = "x" if item.get("evidence_ids") else " "
        kind = item.get("kind", "legacy")
        criterion_lines.append(
            f"- [{marker}] **{item['capability']}** (`{item['id']}` · {kind} · "
            f"{'required' if item['required'] else 'optional'})"
        )
    if not criterion_lines:
        criterion_lines.append("- [ ] To be established from the first diagnostic evidence.")
    why = mission.get("why") or "<!-- Not provided. Clarify only if it changes the learning route. -->"
    return "\n".join([
        "# Learning Mission",
        "",
        f"- Goal: {mission['goal']}",
        f"- Source: {mission['source']}",
        f"- Status: {mission['status']}",
        f"- Created at: {mission['created_at']}",
        "",
        "## Why this matters",
        "",
        why,
        "",
        "## Success looks like",
        "",
        *criterion_lines,
        "",
        "> Checkmarks show linked Evidence, not automatic completion. Use the Completion Gate for authority.",
        "",
        "## Current direction",
        "",
        "Start from real learner evidence; revise the route without redefining the goal.",
        "",
    ])


def _evidence(repo_root: Path, context: project_store.ProjectContext, evidence_id: str) -> dict[str, Any]:
    try:
        receipt = learning_runtime.load_receipt(repo_root, "evidence", evidence_id)
    except learning_runtime.RuntimeContractError as exc:
        raise CompletionGateError(f"cannot use Evidence {evidence_id}: {exc}") from exc
    if (
        receipt.get("workspace_id") != context.workspace_id
        or receipt.get("project_id") != context.project_id
        or receipt.get("mission_id") != context.mission_id
    ):
        raise CompletionGateError("Mission completion Evidence must stay within the selected Mission")
    return receipt


def _qualifies(criterion: dict[str, Any], evidence: dict[str, Any]) -> bool:
    return (
        evidence.get("outcome") == "supports"
        and LEVEL_RANK.get(str(evidence.get("level")), -1) >= LEVEL_RANK[criterion["minimum_level"]]
        and SCAFFOLDING_RANK.get(str(evidence.get("scaffolding")), 99) <= SCAFFOLDING_RANK[criterion["max_scaffolding"]]
        and CONTEXT_RANK.get(str(evidence.get("context")), -1) >= CONTEXT_RANK[criterion["minimum_context"]]
        and DELAY_RANK.get(str(evidence.get("delay")), -1) >= DELAY_RANK[criterion["minimum_delay"]]
        and INDEPENDENCE_RANK.get(str(evidence.get("independence")), -1) >= INDEPENDENCE_RANK[criterion["minimum_independence"]]
    )


def _evaluate(
    repo_root: Path,
    context: project_store.ProjectContext,
    criteria: list[dict[str, Any]],
) -> dict[str, Any]:
    cache: dict[str, dict[str, Any]] = {}
    results: list[dict[str, Any]] = []
    for criterion in criteria:
        qualifying: list[str] = []
        for evidence_id in criterion["evidence_ids"]:
            if evidence_id not in cache:
                cache[evidence_id] = _evidence(repo_root, context, evidence_id)
            if _qualifies(criterion, cache[evidence_id]):
                qualifying.append(evidence_id)
        passed = len(qualifying) >= criterion["minimum_evidence"]
        results.append({
            "id": criterion["id"],
            "capability": criterion["capability"],
            "kind": criterion["kind"],
            "required": criterion["required"],
            "passed": passed,
            "minimum_evidence": criterion["minimum_evidence"],
            "qualifying_evidence_ids": qualifying,
            "cited_evidence_ids": criterion["evidence_ids"],
        })
    required = [item for item in results if item["required"]]
    feynman = [item for item in required if item["kind"] == "feynman" and item["passed"]]
    performance = [item for item in required if item["kind"] in PERFORMANCE_KINDS and item["passed"]]
    distinct_pair = any(
        first != second
        for feynman_item in feynman
        for performance_item in performance
        for first in feynman_item["qualifying_evidence_ids"]
        for second in performance_item["qualifying_evidence_ids"]
    )
    return {
        "ready": bool(required)
        and all(item["passed"] for item in required)
        and bool(feynman)
        and bool(performance)
        and distinct_pair,
        "required_count": len(required),
        "passed_required_count": sum(1 for item in required if item["passed"]),
        "has_distinct_feynman_and_performance_evidence": distinct_pair,
        "criteria": results,
    }


def _validate_completion_record(
    value: dict[str, Any],
    context: project_store.ProjectContext,
) -> list[dict[str, Any]]:
    expected_fields = {
        "schema_version", "kind", "id", "workspace_id", "project_id", "mission_id",
        "completed_at", "criteria", "evidence_ids", "feynman_criterion_ids",
        "independent_performance_criterion_ids",
    }
    if set(value) != expected_fields:
        raise CompletionGateError("Mission completion record has unsupported fields")
    if value["schema_version"] != SCHEMA_VERSION or value["kind"] != "mission-completion":
        raise CompletionGateError("Mission completion record has an unsupported contract")
    completion_id = value["id"]
    if (
        not isinstance(completion_id, str)
        or not completion_id.startswith("comp_")
        or not project_store.EVIDENCE_ID_PATTERN.fullmatch(completion_id.replace("comp_", "ev_", 1))
    ):
        raise CompletionGateError("Mission completion record id is invalid")
    if (
        value["workspace_id"] != context.workspace_id
        or value["project_id"] != context.project_id
        or value["mission_id"] != context.mission_id
    ):
        raise CompletionGateError("Mission completion record scope does not match the selected Mission")
    _text(value["completed_at"], "completed_at", 100)
    criteria = _criteria(value["criteria"])
    cited_ids = sorted({evidence_id for item in criteria for evidence_id in item["evidence_ids"]})
    if value["evidence_ids"] != cited_ids or not cited_ids:
        raise CompletionGateError("Mission completion record Evidence provenance is inconsistent")
    feynman_ids = [item["id"] for item in criteria if item["required"] and item["kind"] == "feynman"]
    performance_ids = [
        item["id"] for item in criteria if item["required"] and item["kind"] in PERFORMANCE_KINDS
    ]
    if value["feynman_criterion_ids"] != feynman_ids:
        raise CompletionGateError("Mission completion record Feynman provenance is inconsistent")
    if value["independent_performance_criterion_ids"] != performance_ids:
        raise CompletionGateError("Mission completion record performance provenance is inconsistent")
    return criteria


def set_completion_criteria(repo_root: Path, payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict) or set(payload) != {"criteria"}:
        raise CompletionGateError("completion criteria input must contain only criteria")
    criteria = _criteria(payload["criteria"])
    repo_root = repo_root.resolve()
    learning_root = repo_root / ".learning"
    with _lifecycle_lock(learning_root):
        context = _context(repo_root)
        if context.project_status != "active" or context.mission_status != "active":
            raise CompletionGateError("completion criteria can only change on an active Project and Mission")
        assert context.mission_root is not None
        completion_path = context.mission_root / "completion.json"
        if completion_path.exists() or completion_path.is_symlink():
            raise CompletionGateError("completion criteria are frozen after a completion record exists")
        for criterion in criteria:
            for evidence_id in criterion["evidence_ids"]:
                _evidence(repo_root, context, evidence_id)
        assert context.mission_manifest_path is not None
        assert context.mission_markdown_path is not None
        mission = _read_object(context.mission_manifest_path, "Mission manifest")
        mission["criteria"] = criteria
        mission["updated_at"] = _now()
        original_manifest = context.mission_manifest_path.read_bytes()
        original_markdown = (
            context.mission_markdown_path.read_bytes()
            if context.mission_markdown_path.is_file()
            else None
        )
        try:
            _write_json_atomic(context.mission_manifest_path, mission)
            _write_text_atomic(context.mission_markdown_path, _mission_projection(mission))
            project_store.resolve_project_context(repo_root)
        except Exception:
            _write_bytes_atomic(context.mission_manifest_path, original_manifest)
            if original_markdown is None:
                context.mission_markdown_path.unlink(missing_ok=True)
            else:
                _write_bytes_atomic(context.mission_markdown_path, original_markdown)
            raise
    return completion_status(repo_root)


def completion_status(repo_root: Path) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    context = _context(repo_root)
    assert context.mission_manifest_path is not None
    assert context.mission_root is not None
    mission = _read_object(context.mission_manifest_path, "Mission manifest")
    completion_path = context.mission_root / "completion.json"
    if (completion_path.exists() or completion_path.is_symlink()) and mission.get("status") != "completed":
        raise CompletionGateError("Mission completion record exists without a completed Mission")
    if mission.get("status") == "completed" and completion_path.is_file():
        record = _read_object(completion_path, "Mission completion record")
        criteria = _validate_completion_record(record, context)
        evaluation = _evaluate(repo_root, context, criteria)
        if not evaluation["ready"]:
            raise CompletionGateError("stored Mission completion no longer satisfies its Evidence gate")
        return {
            "status": "completed",
            "ready": True,
            "project_id": context.project_id,
            "mission_id": context.mission_id,
            "completion_id": record.get("id"),
            "completed_at": record.get("completed_at"),
            **evaluation,
        }
    if mission.get("status") == "completed":
        return {
            "status": "unverified_completed",
            "ready": False,
            "project_id": context.project_id,
            "mission_id": context.mission_id,
            "reason": "completed Mission has no immutable Completion Gate record",
            "criteria": [],
        }
    raw_criteria = mission.get("criteria")
    try:
        criteria = _criteria(raw_criteria)
    except CompletionGateError as exc:
        return {
            "status": "configuration_required",
            "ready": False,
            "project_id": context.project_id,
            "mission_id": context.mission_id,
            "reason": str(exc),
            "criteria": [],
        }
    result = _evaluate(repo_root, context, criteria)
    return {
        "status": "ready" if result["ready"] else "collecting_evidence",
        "project_id": context.project_id,
        "mission_id": context.mission_id,
        **result,
    }


def complete_project(
    repo_root: Path,
    expected_project_id: str | None = None,
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    learning_root = repo_root / ".learning"
    with _lifecycle_lock(learning_root):
        context = _context(repo_root)
        if expected_project_id is not None:
            try:
                expected = project_store.validate_local_id(
                    expected_project_id,
                    "expected_project_id",
                )
            except project_store.ProjectStoreError as exc:
                raise CompletionGateError(str(exc)) from exc
            if context.project_id != expected:
                raise CompletionGateError(
                    "selected Project changed before completion could be committed"
                )
        assert context.mission_manifest_path is not None
        assert context.mission_markdown_path is not None
        assert context.mission_root is not None
        assert context.project_manifest_path is not None
        completion_path = context.mission_root / "completion.json"
        if completion_path.exists() or completion_path.is_symlink():
            if context.mission_status == "completed":
                return completion_status(repo_root)
            raise CompletionGateError("Mission completion record already exists without a completed Mission")
        if context.project_status != "active" or context.mission_status != "active":
            raise CompletionGateError("complete-project requires an active Project and Mission")
        if learning_runtime.pending_learner_turn(repo_root) is not None:
            raise CompletionGateError("assess the pending learner response before completing the Mission")
        mission = _read_object(context.mission_manifest_path, "Mission manifest")
        criteria = _criteria(mission.get("criteria"))
        evaluation = _evaluate(repo_root, context, criteria)
        if not evaluation["ready"]:
            raise CompletionGateError("Mission Completion Gate is not satisfied")
        timestamp = _now()
        project = _read_object(context.project_manifest_path, "Project manifest")
        mission["status"] = "completed"
        mission["updated_at"] = timestamp
        project["status"] = "archived"
        project["maintenance_status"] = "scheduled"
        project["updated_at"] = timestamp
        project["archived_at"] = timestamp
        evidence_ids = sorted({
            evidence_id
            for item in criteria
            for evidence_id in item["evidence_ids"]
        })
        completion = {
            "schema_version": SCHEMA_VERSION,
            "kind": "mission-completion",
            "id": f"comp_{uuid.uuid4().hex[:16]}",
            "workspace_id": context.workspace_id,
            "project_id": context.project_id,
            "mission_id": context.mission_id,
            "completed_at": timestamp,
            "criteria": criteria,
            "evidence_ids": evidence_ids,
            "feynman_criterion_ids": [
                item["id"] for item in criteria if item["required"] and item["kind"] == "feynman"
            ],
            "independent_performance_criterion_ids": [
                item["id"] for item in criteria if item["required"] and item["kind"] in PERFORMANCE_KINDS
            ],
        }
        _validate_completion_record(completion, context)
        original_mission = context.mission_manifest_path.read_bytes()
        original_project = context.project_manifest_path.read_bytes()
        original_markdown = context.mission_markdown_path.read_bytes()
        try:
            _write_json_atomic(context.mission_manifest_path, mission)
            _write_text_atomic(context.mission_markdown_path, _mission_projection(mission))
            _write_json_atomic(context.project_manifest_path, project)
            _write_json_atomic(completion_path, completion)
            updated = project_store.resolve_project_context(repo_root)
            if updated.project_status != "archived" or updated.mission_status != "completed":
                raise CompletionGateError("completion transition did not persist")
        except Exception:
            _write_bytes_atomic(context.mission_manifest_path, original_mission)
            _write_bytes_atomic(context.project_manifest_path, original_project)
            _write_bytes_atomic(context.mission_markdown_path, original_markdown)
            completion_path.unlink(missing_ok=True)
            raise
        return {
            "status": "completed",
            "ready": True,
            "project_id": context.project_id,
            "mission_id": context.mission_id,
            "completion_id": completion["id"],
            "completed_at": timestamp,
            "maintenance_status": "scheduled",
            "evidence_ids": evidence_ids,
        }
