#!/usr/bin/env python3
"""Capture local descriptive observations for the learner-facing vNext product loop.

These checkpoints live under .dogfooding/ and are evaluation evidence only.
They never write .learning/, Runtime receipts, mastery, LearningMap state,
Completion state, or a Phase-4 promotion decision.
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
INTERPRETATION = "descriptive_only_no_phase4_promotion"

TOP_LEVEL_FIELDS = {
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
SURFACE_FIELDS = {
    "entry",
    "today",
    "daily_context",
    "focus",
    "evidence_turn",
    "lifecycle",
    "mobile",
}
OBSERVATION_FIELDS = {
    "entry_time_seconds",
    "today_primary_action_clear",
    "daily_context_usefulness",
    "focus_chrome",
    "scaffold_effect",
    "capture_need",
    "authority_confusion",
    "turn_friction",
}
SURFACE_STATUS = {"pass", "friction", "not_observed"}
DAILY_CONTEXT_USEFULNESS = {"useful", "mixed", "cosmetic", "not_observed"}
FOCUS_CHROME = {"reduced", "distracting", "missing_controls", "not_observed"}
SCAFFOLD_EFFECT = {"helpful", "too_revealing", "insufficient", "not_used", "not_observed"}
CAPTURE_NEED = {"none", "single", "repeated", "not_observed"}
AUTHORITY_CONFUSION = {"none", "observed", "not_observed"}
TURN_FRICTION = {"none", "low", "material", "blocked", "not_observed"}
PROHIBITED_DECISION_FIELDS = {
    "promotion_decision",
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


def _latest_session(arc_dir: Path) -> Path:
    sessions_dir = arc_dir / "sessions"
    _assert_real_directory(sessions_dir, "dogfooding sessions directory")
    if not sessions_dir.is_dir():
        raise ProductDogfoodError("dogfooding arc must contain sessions/")
    sessions = sorted(
        path
        for path in sessions_dir.iterdir()
        if path.is_file() and not path.is_symlink() and SESSION_FILE.fullmatch(path.name)
    )
    if not sessions:
        raise ProductDogfoodError("dogfooding arc has no numbered session record")
    return sessions[-1]


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


def _new_payload(arc_id: str, session: Path) -> dict[str, Any]:
    return {
        "schema_version": "0.1",
        "kind": "vnext-product-dogfood",
        "recorded_at": _now(),
        "arc_id": arc_id,
        "session_id": session.stem,
        "session_record": f"sessions/{session.name}",
        "surface_checks": {
            "entry": "not_observed",
            "today": "not_observed",
            "daily_context": "not_observed",
            "focus": "not_observed",
            "evidence_turn": "not_observed",
            "lifecycle": "not_observed",
            "mobile": "not_observed",
        },
        "observations": {
            "entry_time_seconds": None,
            "today_primary_action_clear": None,
            "daily_context_usefulness": "not_observed",
            "focus_chrome": "not_observed",
            "scaffold_effect": "not_observed",
            "capture_need": "not_observed",
            "authority_confusion": "not_observed",
            "turn_friction": "not_observed",
        },
        "notes": [],
        "interpretation": INTERPRETATION,
    }


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


def validate_checkpoint(
    value: Any,
    *,
    expected_arc_id: str | None = None,
    expected_session_id: str | None = None,
) -> dict[str, Any]:
    """Validate one dogfood checkpoint without inferring any promotion decision."""
    root = _exact_fields(value, TOP_LEVEL_FIELDS, "product checkpoint")
    _reject_prohibited_keys(root)

    if root["schema_version"] != "0.1" or root["kind"] != "vnext-product-dogfood":
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
    if root["interpretation"] != INTERPRETATION:
        raise ProductDogfoodError("product checkpoint lost its descriptive-only boundary")

    surfaces = _exact_fields(root["surface_checks"], SURFACE_FIELDS, "surface_checks")
    for field, status in surfaces.items():
        if status not in SURFACE_STATUS:
            raise ProductDogfoodError(f"surface_checks.{field} is invalid")

    observations = _exact_fields(root["observations"], OBSERVATION_FIELDS, "observations")
    entry_time = observations["entry_time_seconds"]
    if entry_time is not None and (
        not isinstance(entry_time, int) or isinstance(entry_time, bool) or entry_time < 0 or entry_time > 3600
    ):
        raise ProductDogfoodError("entry_time_seconds must be null or an integer from 0 to 3600")
    primary_clear = observations["today_primary_action_clear"]
    if primary_clear is not None and not isinstance(primary_clear, bool):
        raise ProductDogfoodError("today_primary_action_clear must be null or boolean")
    enum_fields = {
        "daily_context_usefulness": DAILY_CONTEXT_USEFULNESS,
        "focus_chrome": FOCUS_CHROME,
        "scaffold_effect": SCAFFOLD_EFFECT,
        "capture_need": CAPTURE_NEED,
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


def start_checkpoint(repo_root: Path, arc: str) -> tuple[Path, dict[str, Any]]:
    repo_root = repo_root.resolve()
    try:
        arc_dir = learning.resolve_arc(repo_root, arc)
    except learning.LearningToolError as exc:
        raise ProductDogfoodError(str(exc)) from exc

    session = _latest_session(arc_dir)
    observations_dir = arc_dir / "product-observations"
    _assert_real_directory(observations_dir, "product-observations directory")
    observations_dir.mkdir(exist_ok=True)
    target = observations_dir / f"{session.stem}.json"
    payload = _new_payload(arc_dir.name, session)
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


def load_checkpoints(repo_root: Path, arc: str) -> tuple[Path, list[dict[str, Any]]]:
    repo_root = repo_root.resolve()
    try:
        arc_dir = learning.resolve_arc(repo_root, arc)
    except learning.LearningToolError as exc:
        raise ProductDogfoodError(str(exc)) from exc

    observations_dir = arc_dir / "product-observations"
    _assert_real_directory(observations_dir, "product-observations directory")
    if not observations_dir.exists():
        return arc_dir, []
    files = sorted(
        path
        for path in observations_dir.iterdir()
        if path.is_file() and not path.is_symlink() and CHECKPOINT_FILE.fullmatch(path.name)
    )
    return arc_dir, [_read_checkpoint(path, arc_dir.name) for path in files]


def summarize(repo_root: Path, arc: str) -> dict[str, Any]:
    """Return descriptive counts only; never emit a feature-promotion verdict."""
    arc_dir, checkpoints = load_checkpoints(repo_root, arc)

    def counts(field: str, values: set[str]) -> dict[str, int]:
        return {
            value: sum(1 for item in checkpoints if item["observations"][field] == value)
            for value in sorted(values)
        }

    return {
        "schema_version": "0.1",
        "kind": "vnext-product-dogfood-summary",
        "arc_id": arc_dir.name,
        "session_count": len(checkpoints),
        "capture_need": counts("capture_need", CAPTURE_NEED),
        "daily_context_usefulness": counts("daily_context_usefulness", DAILY_CONTEXT_USEFULNESS),
        "focus_chrome": counts("focus_chrome", FOCUS_CHROME),
        "scaffold_effect": counts("scaffold_effect", SCAFFOLD_EFFECT),
        "authority_confusion": counts("authority_confusion", AUTHORITY_CONFUSION),
        "turn_friction": counts("turn_friction", TURN_FRICTION),
        "interpretation": INTERPRETATION,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="record local descriptive observations for the AbleArc vNext product loop"
    )
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start = subparsers.add_parser("start", help="create a checkpoint for the latest dogfooding session")
    start.add_argument("arc", help="arc directory name or path under .dogfooding/")

    validate = subparsers.add_parser("validate", help="validate all product checkpoints in an arc")
    validate.add_argument("arc", help="arc directory name or path under .dogfooding/")

    summary = subparsers.add_parser("summary", help="print descriptive product-observation counts")
    summary.add_argument("arc", help="arc directory name or path under .dogfooding/")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    repo_root = args.repo.resolve()
    try:
        if args.command == "start":
            path, payload = start_checkpoint(repo_root, args.arc)
            print(json.dumps({
                "path": str(path.relative_to(repo_root)),
                "session_id": payload["session_id"],
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
        if args.command == "summary":
            print(json.dumps(summarize(repo_root, args.arc), ensure_ascii=False, indent=2))
            return 0
        raise ProductDogfoodError(f"unsupported command: {args.command}")
    except (ProductDogfoodError, learning.LearningToolError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
