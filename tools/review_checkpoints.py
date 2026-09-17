#!/usr/bin/env python3
"""Capture one local descriptive Review-observation checkpoint per dogfooding session.

Checkpoints are evaluation artifacts under .dogfooding/. They snapshot the
read-only report from review_observations.py and never write Runtime learner
state, Review priority, queue membership, or scheduling metadata.
"""

from __future__ import annotations

import argparse
import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from tools import learning
    from tools import review_observations
except ImportError:  # Direct execution
    import learning
    import review_observations


class ReviewCheckpointError(RuntimeError):
    pass


SESSION_FILE = re.compile(r"^[0-9]{3}\.md$")
DESCRIPTIVE_MARKER = "descriptive_only_no_review_priority"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _latest_session(arc_dir: Path) -> Path:
    sessions_dir = arc_dir / "sessions"
    if not sessions_dir.is_dir() or sessions_dir.is_symlink():
        raise ReviewCheckpointError("dogfooding arc must contain a real sessions/ directory")
    sessions = sorted(
        path
        for path in sessions_dir.iterdir()
        if path.is_file() and not path.is_symlink() and SESSION_FILE.fullmatch(path.name)
    )
    if not sessions:
        raise ReviewCheckpointError("dogfooding arc has no numbered session record")
    return sessions[-1]


def _write_json_once(path: Path, payload: dict[str, Any]) -> None:
    if path.exists() or path.is_symlink():
        raise ReviewCheckpointError(
            f"review observation checkpoint already exists for session {path.stem}"
        )
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


def capture_review_checkpoint(
    repo_root: Path,
    arc: str,
    *,
    limit: int = 200,
) -> tuple[Path, dict[str, Any]]:
    """Snapshot the current descriptive delayed-Evidence report for one session."""
    repo_root = repo_root.resolve()
    try:
        arc_dir = learning.resolve_arc(repo_root, arc)
    except learning.LearningToolError as exc:
        raise ReviewCheckpointError(str(exc)) from exc

    session = _latest_session(arc_dir)
    checkpoints = arc_dir / "review-observations"
    if checkpoints.exists() and checkpoints.is_symlink():
        raise ReviewCheckpointError("review-observations/ must not be a symbolic link")
    checkpoints.mkdir(exist_ok=True)

    target = checkpoints / f"{session.stem}.json"
    if target.exists() or target.is_symlink():
        raise ReviewCheckpointError(
            f"review observation checkpoint already exists for session {session.stem}"
        )

    report = review_observations.review_observations(repo_root, limit=limit)
    if report.get("interpretation") != DESCRIPTIVE_MARKER:
        raise ReviewCheckpointError("review observation report lost its descriptive-only boundary")

    payload = {
        "schema_version": "0.1",
        "kind": "review-observation-checkpoint",
        "captured_at": _now(),
        "arc_id": arc_dir.name,
        "session_id": session.stem,
        "session_record": f"sessions/{session.name}",
        "project_id": report.get("project_id"),
        "runtime_revision": report.get("runtime_revision", 0),
        "observation_count": report.get("observation_count", 0),
        "interpretation": report.get("interpretation"),
        "observations": report.get("observations", []),
    }
    _write_json_once(target, payload)
    return target, payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="capture a local descriptive Review-observation checkpoint"
    )
    parser.add_argument("arc", help="arc directory name or path under .dogfooding/")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    parser.add_argument("--limit", type=int, default=200)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        path, payload = capture_review_checkpoint(
            args.repo.resolve(),
            args.arc,
            limit=args.limit,
        )
        print(json.dumps({
            "path": str(path.relative_to(args.repo.resolve())),
            "project_id": payload["project_id"],
            "runtime_revision": payload["runtime_revision"],
            "observation_count": payload["observation_count"],
            "interpretation": payload["interpretation"],
        }, ensure_ascii=False, indent=2))
        return 0
    except (
        ReviewCheckpointError,
        review_observations.ReviewObservationError,
        learning.LearningToolError,
        OSError,
    ) as exc:
        print(f"error: {exc}", file=__import__("sys").stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
