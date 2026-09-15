#!/usr/bin/env python3
"""Local workspace and longitudinal-evaluation helpers for ai4learning.

This tool intentionally does not perform domain teaching or infer learner state.
It scaffolds local files and can open one fixed baseline probe so the Teach/Study
skills remain natural-language first while real evidence stays structured and
private by default.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

try:
    from tools import runtime as learning_runtime
except ImportError:  # Direct execution: python tools/learning.py
    import runtime as learning_runtime

TEMPLATE_FILES = ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md")
DOMAIN_FILES = {
    "probability": "01-probability.md",
    "mathematics": "02-mathematics.md",
    "paper-reading": "03-paper-reading.md",
    "programming-agent": "04-programming-agent.md",
    "conceptual": "05-conceptual.md",
}


class LearningToolError(RuntimeError):
    """Expected user-facing error from local workspace operations."""


MAX_MISSION_GOAL_LENGTH = 1200
MAX_MISSION_CONTEXT_LENGTH = 2400


def repo_root_from_script() -> Path:
    return Path(__file__).resolve().parents[1]


def slugify(value: str) -> str:
    """Produce a readable filesystem-safe slug while preserving Unicode letters."""
    value = value.strip().lower()
    pieces: list[str] = []
    pending_dash = False
    for char in value:
        if char.isalnum():
            if pending_dash and pieces:
                pieces.append("-")
            pieces.append(char)
            pending_dash = False
        else:
            pending_dash = True
    slug = "".join(pieces).strip("-")
    if not slug:
        raise LearningToolError("name must contain at least one letter or digit")
    return slug


def require_file(path: Path, label: str) -> None:
    if not path.is_file():
        raise LearningToolError(f"missing {label}: {path}")


def copy_without_overwrite(src: Path, dst: Path) -> bool:
    if dst.exists():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    return True


def init_learning(repo_root: Path) -> list[Path]:
    """Initialize human projections and the structured runtime without overwrites."""
    templates = repo_root / "templates"
    learning = repo_root / ".learning"
    learning.mkdir(parents=True, exist_ok=True)
    (learning / "records").mkdir(exist_ok=True)
    (learning / "references").mkdir(exist_ok=True)

    created: list[Path] = []
    for name in TEMPLATE_FILES:
        src = templates / name
        require_file(src, f"template {name}")
        dst = learning / name
        if copy_without_overwrite(src, dst):
            created.append(dst)
    created.extend(learning_runtime.init_runtime(repo_root))
    return created


def _single_line(value: str) -> str:
    return " ".join(value.split())


def start_learning_mission(repo_root: Path, goal: str, context: str = "") -> Path:
    """Save one explicit learner-owned mission without inferring a learner model."""
    goal = _single_line(goal)
    context = _single_line(context)
    if not goal:
        raise LearningToolError("mission goal cannot be empty")
    if len(goal) > MAX_MISSION_GOAL_LENGTH:
        raise LearningToolError(
            f"mission goal must be at most {MAX_MISSION_GOAL_LENGTH} characters"
        )
    if len(context) > MAX_MISSION_CONTEXT_LENGTH:
        raise LearningToolError(
            f"mission context must be at most {MAX_MISSION_CONTEXT_LENGTH} characters"
        )

    init_learning(repo_root)
    mission_path = repo_root / ".learning" / "MISSION.md"
    template_path = repo_root / "templates" / "MISSION.md"
    require_file(template_path, "template MISSION.md")
    if mission_path.read_text(encoding="utf-8") != template_path.read_text(encoding="utf-8"):
        raise LearningToolError(
            "mission already started; edit .learning/MISSION.md explicitly instead of overwriting it"
        )
    if learning_runtime.list_receipts(repo_root, "decision"):
        raise LearningToolError(
            "cannot start a new mission while learning decisions already exist in this workspace"
        )

    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    why = context or "<!-- Not provided. Clarify only if it would change the learning route. -->"
    mission_path.write_text(
        "# Learning Mission\n\n"
        f"- Goal: {goal}\n"
        "- Source: learner-explicit\n"
        f"- Created at: {created_at}\n\n"
        "## Why this matters\n\n"
        f"{why}\n\n"
        "## Success looks like\n\n"
        "<!-- The Teach agent should make this observable with the learner; do not invent mastery. -->\n\n"
        "- [ ] To be established from the mission and first diagnostic evidence.\n\n"
        "## Current direction\n\n"
        "Start from real learner evidence; revise the route without silently redefining the goal.\n",
        encoding="utf-8",
    )
    learning_runtime.bootstrap_mission_decision(repo_root, goal)
    return mission_path


def read_mission_payload(value: str) -> tuple[str, str]:
    try:
        if value == "-":
            import sys

            payload = json.load(sys.stdin)
        else:
            with Path(value).open(encoding="utf-8") as handle:
                payload = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise LearningToolError("mission input must be valid JSON") from exc
    if not isinstance(payload, dict):
        raise LearningToolError("mission input must be a JSON object")
    goal = payload.get("goal")
    context = payload.get("context", "")
    if not isinstance(goal, str) or not isinstance(context, str):
        raise LearningToolError("mission goal and context must be strings")
    return goal, context


def next_arc_id(root: Path, domain: str, name: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    base = f"{stamp}-{slugify(domain)}-{slugify(name)}"
    candidate = base
    suffix = 2
    while (root / candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def start_arc(repo_root: Path, domain: str, name: str) -> Path:
    """Create a private local arc with brief, arc record, and first session."""
    if domain not in DOMAIN_FILES:
        choices = ", ".join(DOMAIN_FILES)
        raise LearningToolError(f"unknown domain '{domain}'. choose one of: {choices}")

    dogfooding = repo_root / ".dogfooding"
    dogfooding.mkdir(parents=True, exist_ok=True)

    arc_dir = dogfooding / next_arc_id(dogfooding, domain, name)
    arc_dir.mkdir()
    (arc_dir / "sessions").mkdir()

    sources = {
        repo_root / "evaluation" / "ARC.md": arc_dir / "ARC.md",
        repo_root / "evaluation" / "SESSION.md": arc_dir / "sessions" / "001.md",
        repo_root / "evaluation" / "arcs" / DOMAIN_FILES[domain]: arc_dir / "BRIEF.md",
    }
    for src, dst in sources.items():
        require_file(src, src.as_posix())
        shutil.copyfile(src, dst)

    (arc_dir / "README.md").write_text(
        "# Local longitudinal arc\n\n"
        f"- Domain: `{domain}`\n"
        f"- Working name: `{name}`\n"
        "- Raw learner evidence: local-only by default\n\n"
        "Use `BRIEF.md` to preserve the domain intent, `ARC.md` for cross-session "
        "state, and `sessions/NNN.md` for decisive session evidence. Keep raw "
        "transcripts out unless they are genuinely needed for local research.\n",
        encoding="utf-8",
    )
    return arc_dir


def resolve_arc(repo_root: Path, arc: str) -> Path:
    candidate = Path(arc)
    if not candidate.is_absolute():
        direct = repo_root / candidate
        local = repo_root / ".dogfooding" / candidate
        candidate = direct if direct.is_dir() else local

    candidate = candidate.resolve()
    private_root = (repo_root / ".dogfooding").resolve()
    try:
        candidate.relative_to(private_root)
    except ValueError as exc:
        raise LearningToolError("arc must live under .dogfooding/") from exc

    if not candidate.is_dir():
        raise LearningToolError(f"arc directory not found: {candidate}")
    return candidate


def new_session(repo_root: Path, arc: str) -> Path:
    """Create the next numbered session record without overwriting old evidence."""
    arc_dir = resolve_arc(repo_root, arc)
    sessions = arc_dir / "sessions"
    sessions.mkdir(exist_ok=True)

    existing: list[int] = []
    for path in sessions.glob("[0-9][0-9][0-9].md"):
        try:
            existing.append(int(path.stem))
        except ValueError:
            continue

    next_num = max(existing, default=0) + 1
    dst = sessions / f"{next_num:03d}.md"
    src = repo_root / "evaluation" / "SESSION.md"
    require_file(src, "evaluation/SESSION.md")
    shutil.copyfile(src, dst)
    return dst


def list_arcs(repo_root: Path) -> list[Path]:
    root = repo_root / ".dogfooding"
    if not root.is_dir():
        return []
    return sorted(path for path in root.iterdir() if path.is_dir())


def doctor(repo_root: Path) -> list[str]:
    """Check repository invariants needed by the local runner."""
    problems: list[str] = []

    for name in TEMPLATE_FILES:
        if not (repo_root / "templates" / name).is_file():
            problems.append(f"missing templates/{name}")

    required_eval = (
        "ARC.md",
        "SESSION.md",
        "RUNBOOK.md",
        "PRIVACY.md",
        "PROMOTION.md",
        "FAILURE-TAXONOMY.md",
    )
    for name in required_eval:
        if not (repo_root / "evaluation" / name).is_file():
            problems.append(f"missing evaluation/{name}")

    for filename in DOMAIN_FILES.values():
        if not (repo_root / "evaluation" / "arcs" / filename).is_file():
            problems.append(f"missing evaluation/arcs/{filename}")

    for required in (
        "tools/runtime.py",
        "schemas/runtime-v0.1.json",
        "schemas/learning-artifact-v0.1.json",
        "schemas/learning-artifact-v0.2.json",
        "docs/RUNTIME-CONTRACT.md",
        "docs/LEARNING-ARTIFACTS.md",
        "examples/learning-artifacts/bayes-frequency-tree.json",
    ):
        if not (repo_root / required).is_file():
            problems.append(f"missing {required}")

    gitignore = repo_root / ".gitignore"
    if not gitignore.is_file():
        problems.append("missing .gitignore")
    else:
        text = gitignore.read_text(encoding="utf-8")
        for ignored in (".learning/", ".dogfooding/"):
            if ignored not in text:
                problems.append(f".gitignore does not protect {ignored}")

    return problems


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="learning.py",
        description="Local workspace/evaluation scaffolding for ai4learning.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="create missing .learning/ files from templates")

    mission = sub.add_parser(
        "start-mission",
        help="save an explicit learner goal from a JSON file or stdin",
    )
    mission.add_argument("input", nargs="?", default="-", help="JSON file or - for stdin")

    start = sub.add_parser("start-arc", help="create a local longitudinal arc")
    start.add_argument("domain", choices=tuple(DOMAIN_FILES))
    start.add_argument("name", help="short working name, e.g. bayes-base-rate")

    session = sub.add_parser("new-session", help="create the next session record")
    session.add_argument("arc", help="arc directory name or path under .dogfooding/")

    sub.add_parser("status", help="show local learning/evaluation workspace status")
    sub.add_parser("doctor", help="check repository scaffolding invariants")
    return parser


def main(argv: list[str] | None = None, repo_root: Path | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    root = (repo_root or repo_root_from_script()).resolve()

    try:
        if args.command == "init":
            created = init_learning(root)
            if created:
                print("Created:")
                for path in created:
                    print(f"  {path.relative_to(root)}")
            else:
                print(".learning/ already initialized; no files overwritten.")
            return 0

        if args.command == "start-mission":
            goal, context = read_mission_payload(args.input)
            path = start_learning_mission(root, goal, context)
            decision = learning_runtime.list_receipts(root, "decision")[-1]
            print(json.dumps({
                "ok": True,
                "path": str(path.relative_to(root)),
                "decision_id": decision["id"],
            }))
            return 0

        if args.command == "start-arc":
            init_learning(root)
            arc_dir = start_arc(root, args.domain, args.name)
            print(f"Created {arc_dir.relative_to(root)}")
            print("Start with BRIEF.md, then fill ARC.md and sessions/001.md from real evidence.")
            return 0

        if args.command == "new-session":
            path = new_session(root, args.arc)
            print(f"Created {path.relative_to(root)}")
            return 0

        if args.command == "status":
            learning = root / ".learning"
            print(f"Learning workspace: {'present' if learning.is_dir() else 'not initialized'}")
            arcs = list_arcs(root)
            print(f"Local arcs: {len(arcs)}")
            for arc in arcs:
                sessions = len(list((arc / "sessions").glob("[0-9][0-9][0-9].md")))
                print(f"  {arc.name}: {sessions} session record(s)")
            runtime_root = learning / "runtime"
            print(f"Structured runtime: {'present' if runtime_root.is_dir() else 'not initialized'}")
            if runtime_root.is_dir():
                for kind in learning_runtime.RECEIPT_DIRS:
                    count = len(learning_runtime.list_receipts(root, kind))
                    print(f"  {kind}: {count}")
            return 0

        if args.command == "doctor":
            problems = doctor(root)
            if problems:
                print("Repository checks failed:")
                for problem in problems:
                    print(f"  - {problem}")
                return 1
            print("Repository scaffolding checks passed.")
            return 0

    except LearningToolError as exc:
        parser.error(str(exc))

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
