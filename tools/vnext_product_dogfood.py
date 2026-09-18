#!/usr/bin/env python3
"""Capture local descriptive observations for the learner-facing vNext product loop.

These checkpoints live under .dogfooding/ and are evaluation evidence only.
They never write .learning/, Runtime receipts, mastery, LearningMap state,
Completion state, or a feature-promotion decision.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from tools import learning
except ImportError:  # Direct execution
    import learning


class ProductDogfoodError(RuntimeError):
    pass


SESSION_FILE = re.compile(r"^[0-9]{3}\.md$")
CHECKPOINT_FILE = re.compile(r"^[0-9]{3}\.json$")
CURRENT_SCHEMA_VERSION = "0.3"
LEGACY_SCHEMA_VERSIONS = {"0.1", "0.2"}
INTERPRETATION = "descriptive_only_no_feature_promotion"
LEGACY_INTERPRETATION = "descriptive_only_no_phase4_promotion"

LEGACY_TOP_LEVEL_FIELDS = {
    "schema_version",
    "kind",
    "recorded_at",
    "arc_id",
    "session_id",
    "session_record",
    "surface_checks",
    "observations",
    "notes",
    "interpretation",
}
TOP_LEVEL_FIELDS = LEGACY_TOP_LEVEL_FIELDS | {"entry_mode"}
ENTRY_MODES = {"agent", "workspace"}
WORKSPACE_SURFACE_FIELDS = {
    "entry",
    "today",
    "daily_context",
    "focus",
    "evidence_turn",
    "lifecycle",
    "mobile",
}
AGENT_SURFACE_FIELDS = {
    "conversation",
    "learner_context",
    "control_trace",
    "runtime_turn",
    "verification",
}
OBSERVATION_FIELDS_V01 = {
    "entry_time_seconds",
    "today_primary_action_clear",
    "daily_context_usefulness",
    "focus_chrome",
    "scaffold_effect",
    "capture_need",
    "authority_confusion",
    "turn_friction",
}
OBSERVATION_FIELDS_V02 = {
    "entry_time_seconds",
    "today_primary_action_clear",
    "daily_context_usefulness",
    "focus_chrome",
    "scaffold_effect",
    "continuity_friction",
    "authority_confusion",
    "turn_friction",
}
WORKSPACE_OBSERVATION_FIELDS = OBSERVATION_FIELDS_V02
AGENT_OBSERVATION_FIELDS = {
    "conversation_naturalness",
    "context_usefulness",
    "control_trace_alignment",
    "verification_budget",
    "continuity_friction",
    "authority_confusion",
    "turn_friction",
}
SURFACE_STATUS = {"pass", "friction", "not_observed"}
DAILY_CONTEXT_USEFULNESS = {"useful", "mixed", "cosmetic", "not_observed"}
FOCUS_CHROME = {"reduced", "distracting", "missing_controls", "not_observed"}
SCAFFOLD_EFFECT = {"helpful", "too_revealing", "insufficient", "not_used", "not_observed"}
CONTINUITY_FRICTION = {"none", "single", "repeated", "not_observed"}
AUTHORITY_CONFUSION = {"none", "observed", "not_observed"}
TURN_FRICTION = {"none", "low", "material", "blocked", "not_observed"}
CONVERSATION_NATURALNESS = {"natural", "mixed", "mechanical", "not_observed"}
CONTEXT_USEFULNESS = {"useful", "mixed", "cosmetic", "not_observed"}
CONTROL_TRACE_ALIGNMENT = {"aligned", "late", "missing", "not_observed"}
VERIFICATION_BUDGET = {"proportionate", "overused", "underused", "not_observed"}
PROHIBITED_DECISION_FIELDS = {
    "promotion_decision",
    "feature_promotion_decision",
    "phase4_decision",
    "promote_capture",
    "capture_promoted",
    "mastery_update",
    "map_revision",
    "completion_update",
    "runtime_write",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _assert_real_directory(path: Path, label: str) -> None:
    if path.exists() and path.is_symlink():
        raise ProductDogfoodError(f"{label} must not be a symbolic link")
    if path.exists() and not path.is_dir():
        raise ProductDogfoodError(f"{label} must be a directory")


def _list_sessions(arc_dir: Path) -> list[Path]:
    sessions_dir = arc_dir / "sessions"
    _assert_real_directory(sessions_dir, "dogfooding sessions directory")
    if not sessions_dir.is_dir():
        raise ProductDogfoodError("dogfooding arc must contain sessions/")
    repo_root = arc_dir.parent.parent
    return sorted(
        path
        for path in sessions_dir.iterdir()
        if (
            path.is_file()
            and not path.is_symlink()
            and SESSION_FILE.fullmatch(path.name)
            and learning.is_real_session_record(repo_root, path)
        )
    )


def _latest_session(arc_dir: Path) -> Path:
    sessions = _list_sessions(arc_dir)
    if not sessions:
        raise ProductDogfoodError("dogfooding arc has no real numbered session record")
    return sessions[-1]


def _session_by_id(arc_dir: Path, session_id: str) -> Path:
    if not re.fullmatch(r"[0-9]{3}", session_id):
        raise ProductDogfoodError("session must be a three-digit session number")
    for session in _list_sessions(arc_dir):
        if session.stem == session_id:
            return session
    raise ProductDogfoodError(f"session record not found: sessions/{session_id}.md")


def _checkpoint_files(arc_dir: Path) -> list[Path]:
    observations_dir = arc_dir / "product-observations"
    _assert_real_directory(observations_dir, "product-observations directory")
    if not observations_dir.exists():
        return []
    return sorted(
        path
        for path in observations_dir.iterdir()
        if path.is_file() and not path.is_symlink() and CHECKPOINT_FILE.fullmatch(path.name)
    )


def _write_json_once(path: Path, payload: dict[str, Any]) -> None:
    if path.exists() or path.is_symlink():
        raise ProductDogfoodError(f"product checkpoint already exists for session {path.stem}")
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def _new_payload(arc_id: str, session: Path, entry_mode: str) -> dict[str, Any]:
    if entry_mode not in ENTRY_MODES:
        raise ProductDogfoodError("entry_mode must be agent or workspace")
    payload = {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "kind": "vnext-product-dogfood",
        "recorded_at": _now(),
        "arc_id": arc_id,
        "session_id": session.stem,
        "session_record": f"sessions/{session.name}",
        "entry_mode": entry_mode,
        "notes": [],
        "interpretation": INTERPRETATION,
    }
    if entry_mode == "workspace":
        payload["surface_checks"] = {
            "entry": "not_observed",
            "today": "not_observed",
            "daily_context": "not_observed",
            "focus": "not_observed",
            "evidence_turn": "not_observed",
            "lifecycle": "not_observed",
            "mobile": "not_observed",
        }
        payload["observations"] = {
            "entry_time_seconds": None,
            "today_primary_action_clear": None,
            "daily_context_usefulness": "not_observed",
            "focus_chrome": "not_observed",
            "scaffold_effect": "not_observed",
            "continuity_friction": "not_observed",
            "authority_confusion": "not_observed",
            "turn_friction": "not_observed",
        }
    else:
        payload["surface_checks"] = {
            "conversation": "not_observed",
            "learner_context": "not_observed",
            "control_trace": "not_observed",
            "runtime_turn": "not_observed",
            "verification": "not_observed",
        }
        payload["observations"] = {
            "conversation_naturalness": "not_observed",
            "context_usefulness": "not_observed",
            "control_trace_alignment": "not_observed",
            "verification_budget": "not_observed",
            "continuity_friction": "not_observed",
            "authority_confusion": "not_observed",
            "turn_friction": "not_observed",
        }
    return payload


def _reject_prohibited_keys(value: Any) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in PROHIBITED_DECISION_FIELDS:
                raise ProductDogfoodError(
                    f"product checkpoint must not contain decision field {key}"
                )
            _reject_prohibited_keys(child)
    elif isinstance(value, list):
        for child in value:
            _reject_prohibited_keys(child)


def _exact_fields(value: Any, expected: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ProductDogfoodError(f"{label} must be an object")
    keys = set(value)
    if keys != expected:
        raise ProductDogfoodError(f"{label} fields are invalid")
    return value


def _schema_contract(root: dict[str, Any]) -> tuple[str, set[str], set[str], str, str]:
    version = root.get("schema_version")
    if version == CURRENT_SCHEMA_VERSION:
        entry_mode = root.get("entry_mode")
        if entry_mode == "workspace":
            return (
                entry_mode,
                WORKSPACE_SURFACE_FIELDS,
                WORKSPACE_OBSERVATION_FIELDS,
                "continuity_friction",
                INTERPRETATION,
            )
        if entry_mode == "agent":
            return (
                entry_mode,
                AGENT_SURFACE_FIELDS,
                AGENT_OBSERVATION_FIELDS,
                "continuity_friction",
                INTERPRETATION,
            )
        raise ProductDogfoodError("entry_mode must be agent or workspace")
    if version == "0.2":
        return (
            "workspace",
            WORKSPACE_SURFACE_FIELDS,
            OBSERVATION_FIELDS_V02,
            "continuity_friction",
            INTERPRETATION,
        )
    if version == "0.1":
        return (
            "workspace",
            WORKSPACE_SURFACE_FIELDS,
            OBSERVATION_FIELDS_V01,
            "capture_need",
            LEGACY_INTERPRETATION,
        )
    raise ProductDogfoodError("unsupported product checkpoint schema")


def validate_checkpoint(
    value: Any,
    *,
    expected_arc_id: str | None = None,
    expected_session_id: str | None = None,
) -> dict[str, Any]:
    """Validate one dogfood checkpoint without inferring any promotion decision."""
    if not isinstance(value, dict):
        raise ProductDogfoodError("product checkpoint must be an object")
    expected_top_level = (
        TOP_LEVEL_FIELDS
        if value.get("schema_version") == CURRENT_SCHEMA_VERSION
        else LEGACY_TOP_LEVEL_FIELDS
    )
    root = _exact_fields(value, expected_top_level, "product checkpoint")
    _reject_prohibited_keys(root)

    (
        _entry_mode,
        surface_fields,
        observation_fields,
        continuity_field,
        expected_interpretation,
    ) = _schema_contract(root)
    if root["kind"] != "vnext-product-dogfood":
        raise ProductDogfoodError("unsupported product checkpoint schema")
    if not isinstance(root["recorded_at"], str):
        raise ProductDogfoodError("recorded_at must be an ISO timestamp")
    try:
        datetime.fromisoformat(root["recorded_at"].replace("Z", "+00:00"))
    except ValueError as exc:
        raise ProductDogfoodError("recorded_at must be an ISO timestamp") from exc

    if not isinstance(root["arc_id"], str) or not root["arc_id"].strip():
        raise ProductDogfoodError("arc_id must be non-empty")
    if expected_arc_id is not None and root["arc_id"] != expected_arc_id:
        raise ProductDogfoodError("product checkpoint arc scope does not match")
    if not isinstance(root["session_id"], str) or not re.fullmatch(r"[0-9]{3}", root["session_id"]):
        raise ProductDogfoodError("session_id must be a three-digit session number")
    if expected_session_id is not None and root["session_id"] != expected_session_id:
        raise ProductDogfoodError("product checkpoint session scope does not match")
    if root["session_record"] != f"sessions/{root['session_id']}.md":
        raise ProductDogfoodError("session_record does not match session_id")
    if root["interpretation"] != expected_interpretation:
        raise ProductDogfoodError("product checkpoint lost its descriptive-only boundary")

    surfaces = _exact_fields(root["surface_checks"], surface_fields, "surface_checks")
    for field, status in surfaces.items():
        if status not in SURFACE_STATUS:
            raise ProductDogfoodError(f"surface_checks.{field} is invalid")

    observations = _exact_fields(root["observations"], observation_fields, "observations")
    if _entry_mode == "workspace":
        entry_time = observations["entry_time_seconds"]
        if entry_time is not None and (
            not isinstance(entry_time, int)
            or isinstance(entry_time, bool)
            or entry_time < 0
            or entry_time > 3600
        ):
            raise ProductDogfoodError(
                "entry_time_seconds must be null or an integer from 0 to 3600"
            )
        primary_clear = observations["today_primary_action_clear"]
        if primary_clear is not None and not isinstance(primary_clear, bool):
            raise ProductDogfoodError("today_primary_action_clear must be null or boolean")
        enum_fields = {
            "daily_context_usefulness": DAILY_CONTEXT_USEFULNESS,
            "focus_chrome": FOCUS_CHROME,
            "scaffold_effect": SCAFFOLD_EFFECT,
            continuity_field: CONTINUITY_FRICTION,
            "authority_confusion": AUTHORITY_CONFUSION,
            "turn_friction": TURN_FRICTION,
        }
    else:
        enum_fields = {
            "conversation_naturalness": CONVERSATION_NATURALNESS,
            "context_usefulness": CONTEXT_USEFULNESS,
            "control_trace_alignment": CONTROL_TRACE_ALIGNMENT,
            "verification_budget": VERIFICATION_BUDGET,
            "continuity_friction": CONTINUITY_FRICTION,
            "authority_confusion": AUTHORITY_CONFUSION,
            "turn_friction": TURN_FRICTION,
        }
    for field, allowed in enum_fields.items():
        if observations[field] not in allowed:
            raise ProductDogfoodError(f"observations.{field} is invalid")

    notes = root["notes"]
    if not isinstance(notes, list) or len(notes) > 20:
        raise ProductDogfoodError("notes must be a list with at most 20 entries")
    if any(not isinstance(note, str) or len(note) > 2000 for note in notes):
        raise ProductDogfoodError("each note must be text with at most 2000 characters")

    return root


def start_checkpoint(
    repo_root: Path,
    arc: str,
    *,
    entry_mode: str,
    session_id: str | None = None,
) -> tuple[Path, dict[str, Any]]:
    repo_root = repo_root.resolve()
    try:
        arc_dir = learning.resolve_arc(repo_root, arc)
    except learning.LearningToolError as exc:
        raise ProductDogfoodError(str(exc)) from exc

    session = _session_by_id(arc_dir, session_id) if session_id is not None else _latest_session(arc_dir)
    observations_dir = arc_dir / "product-observations"
    _assert_real_directory(observations_dir, "product-observations directory")
    observations_dir.mkdir(exist_ok=True)
    target = observations_dir / f"{session.stem}.json"
    payload = _new_payload(arc_dir.name, session, entry_mode)
    validate_checkpoint(
        payload,
        expected_arc_id=arc_dir.name,
        expected_session_id=session.stem,
    )
    _write_json_once(target, payload)
    return target, payload


def _read_checkpoint(path: Path, arc_id: str) -> dict[str, Any]:
    if path.is_symlink() or not path.is_file():
        raise ProductDogfoodError(f"checkpoint must be a real file: {path}")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ProductDogfoodError(f"cannot read valid checkpoint JSON: {path}") from exc
    return validate_checkpoint(raw, expected_arc_id=arc_id, expected_session_id=path.stem)


def coverage_status(repo_root: Path, arc: str) -> dict[str, Any]:
    """Describe session/checkpoint coverage without evaluating feature promotion."""
    repo_root = repo_root.resolve()
    try:
        arc_dir = learning.resolve_arc(repo_root, arc)
    except learning.LearningToolError as exc:
        raise ProductDogfoodError(str(exc)) from exc

    session_ids = [path.stem for path in _list_sessions(arc_dir)]
    checkpoint_ids = [path.stem for path in _checkpoint_files(arc_dir)]
    session_set = set(session_ids)
    checkpoint_set = set(checkpoint_ids)
    return {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "kind": "vnext-product-dogfood-coverage",
        "arc_id": arc_dir.name,
        "session_ids": session_ids,
        "checkpoint_ids": checkpoint_ids,
        "missing_checkpoint_ids": sorted(session_set - checkpoint_set),
        "orphan_checkpoint_ids": sorted(checkpoint_set - session_set),
        "interpretation": INTERPRETATION,
    }


def load_checkpoints(repo_root: Path, arc: str) -> tuple[Path, list[dict[str, Any]]]:
    repo_root = repo_root.resolve()
    try:
        arc_dir = learning.resolve_arc(repo_root, arc)
    except learning.LearningToolError as exc:
        raise ProductDogfoodError(str(exc)) from exc

    sessions = _list_sessions(arc_dir)
    session_ids = {path.stem for path in sessions}
    files = _checkpoint_files(arc_dir)
    orphan_ids = sorted(path.stem for path in files if path.stem not in session_ids)
    if orphan_ids:
        raise ProductDogfoodError(
            "product checkpoint has no matching session record: " + ", ".join(orphan_ids)
        )
    return arc_dir, [_read_checkpoint(path, arc_dir.name) for path in files]


def _continuity_value(item: dict[str, Any]) -> str:
    observations = item["observations"]
    if item["schema_version"] == "0.1":
        return observations["capture_need"]
    return observations["continuity_friction"]


def _entry_mode(item: dict[str, Any]) -> str:
    if item["schema_version"] in LEGACY_SCHEMA_VERSIONS:
        return "workspace"
    return item["entry_mode"]


def summarize(repo_root: Path, arc: str) -> dict[str, Any]:
    """Return descriptive counts only; never emit a feature-promotion verdict."""
    arc_dir, checkpoints = load_checkpoints(repo_root, arc)

    def counts(items: list[dict[str, Any]], field: str, values: set[str]) -> dict[str, int]:
        return {
            value: sum(1 for item in items if item["observations"][field] == value)
            for value in sorted(values)
        }

    workspace = [item for item in checkpoints if _entry_mode(item) == "workspace"]
    agent = [item for item in checkpoints if _entry_mode(item) == "agent"]
    return {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "kind": "vnext-product-dogfood-summary",
        "arc_id": arc_dir.name,
        "session_count": len(checkpoints),
        "entry_modes": {
            "workspace": {
                "session_count": len(workspace),
                "continuity_friction": {
                    value: sum(1 for item in workspace if _continuity_value(item) == value)
                    for value in sorted(CONTINUITY_FRICTION)
                },
                "daily_context_usefulness": counts(
                    workspace, "daily_context_usefulness", DAILY_CONTEXT_USEFULNESS
                ),
                "focus_chrome": counts(workspace, "focus_chrome", FOCUS_CHROME),
                "scaffold_effect": counts(workspace, "scaffold_effect", SCAFFOLD_EFFECT),
                "authority_confusion": counts(
                    workspace, "authority_confusion", AUTHORITY_CONFUSION
                ),
                "turn_friction": counts(workspace, "turn_friction", TURN_FRICTION),
            },
            "agent": {
                "session_count": len(agent),
                "conversation_naturalness": counts(
                    agent, "conversation_naturalness", CONVERSATION_NATURALNESS
                ),
                "context_usefulness": counts(agent, "context_usefulness", CONTEXT_USEFULNESS),
                "control_trace_alignment": counts(
                    agent, "control_trace_alignment", CONTROL_TRACE_ALIGNMENT
                ),
                "verification_budget": counts(agent, "verification_budget", VERIFICATION_BUDGET),
                "continuity_friction": counts(agent, "continuity_friction", CONTINUITY_FRICTION),
                "authority_confusion": counts(agent, "authority_confusion", AUTHORITY_CONFUSION),
                "turn_friction": counts(agent, "turn_friction", TURN_FRICTION),
            },
        },
        "interpretation": INTERPRETATION,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="record local descriptive observations for the AbleArc vNext product loop"
    )
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start = subparsers.add_parser("start", help="create a checkpoint for a real dogfooding session")
    start.add_argument("arc", help="arc directory name or path under .dogfooding/")
    start.add_argument(
        "--entry-mode",
        choices=sorted(ENTRY_MODES),
        required=True,
        help="surface that originated the session; keeps incompatible observations separate",
    )
    start.add_argument(
        "--session",
        help="optional three-digit session ID to backfill; defaults to the latest real session",
    )

    validate = subparsers.add_parser("validate", help="validate all product checkpoints in an arc")
    validate.add_argument("arc", help="arc directory name or path under .dogfooding/")

    status = subparsers.add_parser("status", help="show descriptive session/checkpoint coverage")
    status.add_argument("arc", help="arc directory name or path under .dogfooding/")

    summary = subparsers.add_parser("summary", help="print descriptive product-observation counts")
    summary.add_argument("arc", help="arc directory name or path under .dogfooding/")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    repo_root = args.repo.resolve()
    try:
        if args.command == "start":
            path, payload = start_checkpoint(
                repo_root,
                args.arc,
                entry_mode=args.entry_mode,
                session_id=args.session,
            )
            print(json.dumps({
                "path": str(path.relative_to(repo_root)),
                "session_id": payload["session_id"],
                "entry_mode": payload["entry_mode"],
                "interpretation": payload["interpretation"],
            }, ensure_ascii=False, indent=2))
            return 0
        if args.command == "validate":
            arc_dir, checkpoints = load_checkpoints(repo_root, args.arc)
            print(json.dumps({
                "arc_id": arc_dir.name,
                "validated": len(checkpoints),
                "interpretation": INTERPRETATION,
            }, ensure_ascii=False, indent=2))
            return 0
        if args.command == "status":
            print(json.dumps(coverage_status(repo_root, args.arc), ensure_ascii=False, indent=2))
            return 0
        if args.command == "summary":
            print(json.dumps(summarize(repo_root, args.arc), ensure_ascii=False, indent=2))
            return 0
        raise ProductDogfoodError(f"unsupported command: {args.command}")
    except (ProductDogfoodError, learning.LearningToolError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
