#!/usr/bin/env python3
"""Local workspace and longitudinal-evaluation helpers for ai4learning.

This tool intentionally does not perform domain teaching or infer learner state.
It scaffolds local files and can open one fixed baseline probe so the Teach/Study
skills remain natural-language first while real evidence stays structured and
private by default.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    from tools import project_lifecycle
    from tools import runtime as learning_runtime
    from tools import project_store
except ImportError:  # Direct execution: python tools/learning.py
    import project_lifecycle
    import runtime as learning_runtime
    import project_store

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
    if project_store.detect_layout(repo_root) == project_store.LAYOUT_WORKSPACE:
        context = project_store.resolve_project_context(repo_root)
        created: list[Path] = []
        for directory in (
            context.materials_root,
            context.records_root,
            context.references_root,
        ):
            if not directory.exists():
                directory.mkdir(parents=True)
                created.append(directory)
        created.extend(learning_runtime.init_runtime(repo_root))
        return created

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
    if project_store.detect_layout(repo_root) == project_store.LAYOUT_WORKSPACE:
        raise LearningToolError(
            "workspace-v0.2 requires the project-aware mission lifecycle; the legacy start command will not write root state"
        )
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


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _write_json_atomic(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def _portable_local_id(value: str, prefix: str) -> str:
    """Derive an ASCII manifest ID while preserving Unicode in display fields."""
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
    result = "".join(pieces).strip("-")[:64].rstrip("-")
    if not result:
        digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:10]
        result = f"{prefix}-{digest}"
    return project_store.validate_local_id(result, f"{prefix}_id")


def _section_text(markdown: str, heading: str) -> str:
    match = re.search(
        rf"^##\s+{re.escape(heading)}\s*$\s*(.*?)(?=^##\s+|\Z)",
        markdown,
        flags=re.IGNORECASE | re.MULTILINE | re.DOTALL,
    )
    if not match:
        return ""
    body = re.sub(r"<!--.*?-->", "", match.group(1), flags=re.DOTALL)
    return " ".join(
        line.strip().lstrip("-* ")
        for line in body.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ).strip()


def _legacy_mission_metadata(mission_path: Path) -> tuple[str, str, str]:
    try:
        markdown = mission_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise LearningToolError("legacy MISSION.md is required for migration") from exc
    goal_match = re.search(r"^-\s*Goal:\s*(.+)$", markdown, flags=re.IGNORECASE | re.MULTILINE)
    goal = goal_match.group(1).strip() if goal_match else _section_text(
        markdown, "I want to become able to"
    )
    if not goal:
        raise LearningToolError("legacy MISSION.md must contain an explicit learner goal")
    why = _section_text(markdown, "Why this matters")
    source_match = re.search(r"^-\s*Source:\s*(.+)$", markdown, flags=re.IGNORECASE | re.MULTILINE)
    source = source_match.group(1).strip() if source_match else "imported"
    if source not in ("learner-explicit", "agent-assisted", "imported"):
        source = "imported"
    return _single_line(goal)[:MAX_MISSION_GOAL_LENGTH], _single_line(why)[:MAX_MISSION_CONTEXT_LENGTH], source


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _copy_checked(
    source: Path,
    destination: Path,
    copied: list[dict[str, str]],
    learning_root: Path,
    project_root: Path,
) -> None:
    if source.is_symlink():
        raise LearningToolError(f"migration refuses symbolic link: {source.relative_to(learning_root)}")
    if source.is_dir():
        for child in source.rglob("*"):
            if child.is_symlink():
                raise LearningToolError(
                    f"migration refuses symbolic link: {child.relative_to(learning_root)}"
                )
        shutil.copytree(source, destination)
        pairs = [
            (child, destination / child.relative_to(source))
            for child in source.rglob("*")
            if child.is_file()
        ]
    elif source.is_file():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        pairs = [(source, destination)]
    else:
        return

    for original, copied_path in pairs:
        original_hash = _sha256(original)
        if original_hash != _sha256(copied_path):
            raise LearningToolError(f"checksum mismatch while copying {original.name}")
        copied.append(
            {
                "source": original.relative_to(learning_root).as_posix(),
                "destination": copied_path.relative_to(project_root).as_posix(),
                "sha256": original_hash,
            }
        )


def migrate_legacy_workspace(
    repo_root: Path,
    *,
    project_title: str | None = None,
    project_id: str | None = None,
    mission_id: str | None = None,
    runtime_verifier=None,
) -> dict:
    """Copy v0.1 state into v0.2 paths and activate only after verification."""
    repo_root = repo_root.resolve()
    layout = project_store.detect_layout(repo_root)
    if layout == project_store.LAYOUT_WORKSPACE:
        active = project_store.resolve_project_context(repo_root)
        return {
            "status": "already_activated",
            "workspace_id": active.workspace_id,
            "project_id": active.project_id,
            "mission_id": active.mission_id,
        }
    if layout != project_store.LAYOUT_LEGACY:
        raise LearningToolError("only an initialized legacy-v0.1 workspace can be migrated")

    learning_root = repo_root / ".learning"
    goal, why, source = _legacy_mission_metadata(learning_root / "MISSION.md")
    title = _single_line(project_title or goal)[:200]
    if not title:
        raise LearningToolError("project title cannot be empty")
    try:
        selected_project_id = (
            project_store.validate_local_id(project_id, "project_id")
            if project_id
            else _portable_local_id(title, "project")
        )
        selected_mission_id = (
            project_store.validate_local_id(mission_id, "mission_id")
            if mission_id
            else "primary-mission"
        )
    except project_store.ProjectStoreError as exc:
        raise LearningToolError(str(exc)) from exc

    learning_runtime.init_runtime(repo_root)
    migration_id = f"mig_{uuid.uuid4().hex[:16]}"
    workspace_id = f"ws_{uuid.uuid4().hex[:16]}"
    projects_root = learning_root / "projects"
    migrations_root = learning_root / "migrations"
    for managed_root in (projects_root, migrations_root):
        if managed_root.is_symlink():
            raise LearningToolError(
                f"migration refuses symbolic link: {managed_root.relative_to(learning_root)}"
            )
    projects_root.mkdir(exist_ok=True)
    target_root = projects_root / selected_project_id
    if target_root.exists():
        raise LearningToolError(f"migration target already exists: projects/{selected_project_id}")
    staging_root = projects_root / f".migrating-{migration_id}"
    failed_root = migrations_root / "failed" / migration_id
    report_path = migrations_root / f"{migration_id}.json"
    workspace_path = learning_root / "workspace.json"
    copied: list[dict[str, str]] = []
    timestamp = _now()

    try:
        staging_root.mkdir(parents=True)
        destinations = {
            "MISSION.md": staging_root / "missions" / selected_mission_id / "MISSION.md",
            "ROADMAP.md": staging_root / "map" / "ROADMAP.md",
            "STATE.md": staging_root / "STATE.md",
            "records": staging_root / "records",
            "references": staging_root / "references",
            "artifacts": staging_root / "artifacts",
            "runtime": staging_root / "runtime",
        }
        for name, destination in destinations.items():
            _copy_checked(learning_root / name, destination, copied, learning_root, staging_root)
        for directory in (
            staging_root / "materials",
            staging_root / "records",
            staging_root / "references",
            staging_root / "artifacts",
        ):
            directory.mkdir(parents=True, exist_ok=True)

        mission_root = staging_root / "missions" / selected_mission_id
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
            staging_root / "project.json",
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
        staging_root.replace(target_root)

        report = {
            "schema_version": "0.2",
            "id": migration_id,
            "status": "prepared",
            "source_layout": "legacy-v0.1",
            "target_layout": "workspace-v0.2",
            "workspace_id": workspace_id,
            "project_id": selected_project_id,
            "mission_id": selected_mission_id,
            "created_at": timestamp,
            "updated_at": timestamp,
            "copied_files": copied,
            "legacy_source_retained": True,
        }
        _write_json_atomic(report_path, report)
        _write_json_atomic(
            workspace_path,
            {
                "schema_version": "0.2",
                "id": workspace_id,
                "active_project_id": selected_project_id,
                "onboarding": {"intro_seen": True},
                "created_at": timestamp,
                "updated_at": timestamp,
            },
        )

        verifier = runtime_verifier or learning_runtime.verify_runtime
        problems = verifier(repo_root)
        if problems:
            raise LearningToolError("migrated runtime verification failed: " + "; ".join(problems))
        active = project_store.resolve_project_context(repo_root)
        if active.project_id != selected_project_id or active.mission_id != selected_mission_id:
            raise LearningToolError("activated project context does not match the migration target")

        report["status"] = "activated"
        report["updated_at"] = _now()
        _write_json_atomic(report_path, report)
        return report
    except Exception as exc:
        failed_root.mkdir(parents=True, exist_ok=True)
        if workspace_path.exists():
            workspace_path.replace(failed_root / "workspace.json")
        if target_root.exists():
            target_root.replace(failed_root / selected_project_id)
        elif staging_root.exists():
            staging_root.replace(failed_root / selected_project_id)
        failure_report = {
            "schema_version": "0.2",
            "id": migration_id,
            "status": "failed",
            "source_layout": "legacy-v0.1",
            "target_layout": "workspace-v0.2",
            "workspace_id": workspace_id,
            "project_id": selected_project_id,
            "mission_id": selected_mission_id,
            "created_at": timestamp,
            "updated_at": _now(),
            "error": str(exc),
            "recovery_copy": failed_root.relative_to(learning_root).as_posix(),
            "legacy_source_retained": True,
        }
        _write_json_atomic(report_path, failure_report)
        if isinstance(exc, LearningToolError):
            raise
        raise LearningToolError(f"workspace migration failed safely: {exc}") from exc


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


def read_project_payload(value: str) -> dict:
    try:
        if value == "-":
            import sys

            payload = json.load(sys.stdin)
        else:
            with Path(value).open(encoding="utf-8") as handle:
                payload = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise LearningToolError("Project input must be valid JSON") from exc
    if not isinstance(payload, dict):
        raise LearningToolError("Project input must be a JSON object")
    allowed = {"title", "goal", "why", "project_id", "mission_id", "source"}
    unknown = set(payload) - allowed
    if unknown:
        raise LearningToolError(
            "unknown Project fields: " + ", ".join(sorted(unknown))
        )
    for required in ("title", "goal"):
        if not isinstance(payload.get(required), str):
            raise LearningToolError(f"Project {required} must be a string")
    for optional in ("why", "project_id", "mission_id", "source"):
        if optional in payload and not isinstance(payload[optional], str):
            raise LearningToolError(f"Project {optional} must be a string")
    return payload


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
        "tools/project_store.py",
        "tools/project_lifecycle.py",
        "tools/runtime.py",
        "schemas/workspace-v0.2.json",
        "schemas/project-v0.2.json",
        "schemas/mission-v0.2.json",
        "schemas/runtime-v0.1.json",
        "schemas/runtime-v0.2.json",
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

    migrate = sub.add_parser(
        "migrate-workspace",
        help="copy a legacy v0.1 workspace into verified v0.2 project storage",
    )
    migrate.add_argument("--project-title", help="display title; defaults to the Mission goal")
    migrate.add_argument("--project-id", help="optional safe ASCII project ID")
    migrate.add_argument("--mission-id", help="optional safe ASCII mission ID")

    mission = sub.add_parser(
        "start-mission",
        help="save an explicit learner goal from a JSON file or stdin",
    )
    mission.add_argument("input", nargs="?", default="-", help="JSON file or - for stdin")

    create_project_parser = sub.add_parser(
        "create-project",
        help="create and select a workspace-v0.2 Project from JSON",
    )
    create_project_parser.add_argument(
        "input",
        nargs="?",
        default="-",
        help="JSON file or - for stdin",
    )
    sub.add_parser("projects", help="list Projects and lifecycle state as JSON")
    sub.add_parser(
        "brief",
        help="print a concise read-only session-start learning brief as JSON",
    )
    for command, help_text in (
        ("switch-project", "select an existing non-archived Project"),
        ("pause-project", "make an active Project read-only"),
        ("resume-project", "resume and select a paused Project"),
        ("archive-project", "archive a Project without deleting its learning state"),
        ("maintenance-start", "temporarily open an archived Project for review"),
        ("maintenance-due", "mark an archived Project due for review"),
    ):
        command_parser = sub.add_parser(command, help=help_text)
        command_parser.add_argument("project_id")
    maintenance_finish_parser = sub.add_parser(
        "maintenance-finish",
        help="close an archived Project maintenance study",
    )
    maintenance_finish_parser.add_argument("project_id")
    maintenance_finish_parser.add_argument(
        "outcome",
        choices=("retention_confirmed", "needs_study"),
    )

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

        if args.command == "migrate-workspace":
            result = migrate_legacy_workspace(
                root,
                project_title=args.project_title,
                project_id=args.project_id,
                mission_id=args.mission_id,
            )
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0

        if args.command == "create-project":
            payload = read_project_payload(args.input)
            result = project_lifecycle.create_project(root, **payload)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0

        if args.command == "projects":
            print(
                json.dumps(
                    {"projects": project_lifecycle.list_projects(root)},
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0

        if args.command == "brief":
            print(
                json.dumps(
                    project_lifecycle.learning_brief(root),
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0

        lifecycle_commands = {
            "switch-project": project_lifecycle.switch_project,
            "pause-project": project_lifecycle.pause_project,
            "resume-project": project_lifecycle.resume_project,
            "archive-project": project_lifecycle.archive_project,
            "maintenance-start": project_lifecycle.maintenance_start,
            "maintenance-due": project_lifecycle.maintenance_due,
        }
        if args.command in lifecycle_commands:
            result = lifecycle_commands[args.command](root, args.project_id)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0

        if args.command == "maintenance-finish":
            result = project_lifecycle.maintenance_finish(
                root,
                args.project_id,
                args.outcome,
            )
            print(json.dumps(result, ensure_ascii=False, indent=2))
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
            if project_store.detect_layout(root) == project_store.LAYOUT_WORKSPACE:
                projects = project_lifecycle.list_projects(root)
                print(f"Projects: {len(projects)}")
                for project in projects:
                    marker = "*" if project["selected"] else " "
                    print(
                        f"  {marker} {project['id']}: {project['status']} "
                        f"(maintenance: {project['maintenance_status']})"
                    )
            arcs = list_arcs(root)
            print(f"Local arcs: {len(arcs)}")
            for arc in arcs:
                sessions = len(list((arc / "sessions").glob("[0-9][0-9][0-9].md")))
                print(f"  {arc.name}: {sessions} session record(s)")
            try:
                runtime_root = project_store.resolve_project_context(root).runtime_root
            except project_store.ProjectStoreError:
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

    except (LearningToolError, project_lifecycle.ProjectLifecycleError) as exc:
        parser.error(str(exc))

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
