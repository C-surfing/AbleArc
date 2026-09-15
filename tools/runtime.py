#!/usr/bin/env python3
"""Authority-aware, append-only learning transaction runtime.

The runtime records what an agent decided, what the learner actually did, how
that observation was interpreted, and why a proposed learner-state change was
accepted or rejected. It deliberately does not choose teaching moves or infer
mastery: those remain agent responsibilities. This module makes their outputs
inspectable and enforces a few conservative state-transition invariants.
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

SCHEMA_VERSION = "0.1"
MASTERY_STATES = ("unknown", "exposed", "developing", "stable", "transferable")
EVIDENCE_LEVELS = ("recognition", "recall", "explanation", "application", "transfer")
MOVE_TYPES = (
    "orient",
    "probe",
    "motivate",
    "establish_intuition",
    "name_or_formalize",
    "connect",
    "contrast",
    "derive",
    "worked_example",
    "prediction",
    "practice",
    "retrieve",
    "repair_misconception",
    "apply",
    "generalize",
    "transfer",
    "compress_or_reference",
)
RECEIPT_DIRS = {
    "decision": "decisions",
    "observation": "observations",
    "evidence": "evidence",
    "state-proposal": "state-proposals",
    "state-decision": "state-decisions",
    "turn": "turns",
}
ID_PREFIXES = {
    "decision": "dec",
    "observation": "obs",
    "evidence": "ev",
    "state-proposal": "sp",
    "state-decision": "sd",
    "turn": "turn",
}


class RuntimeContractError(RuntimeError):
    """A receipt or requested state transition violates the runtime contract."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _runtime_root(repo_root: Path) -> Path:
    return repo_root / ".learning" / "runtime"


def _receipt_root(repo_root: Path, kind: str) -> Path:
    try:
        directory = RECEIPT_DIRS[kind]
    except KeyError as exc:
        raise RuntimeContractError(f"unknown receipt kind: {kind}") from exc
    return _runtime_root(repo_root) / "receipts" / directory


def _state_path(repo_root: Path) -> Path:
    return _runtime_root(repo_root) / "state.json"


def _new_id(kind: str) -> str:
    return f"{ID_PREFIXES[kind]}_{uuid.uuid4().hex[:16]}"


def _required_string(data: dict[str, Any], field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise RuntimeContractError(f"{field} must be a non-empty string")
    return value.strip()


def _optional_string(data: dict[str, Any], field: str) -> str | None:
    value = data.get(field)
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise RuntimeContractError(f"{field} must be a non-empty string when provided")
    return value.strip()


def _enum(data: dict[str, Any], field: str, choices: tuple[str, ...]) -> str:
    value = _required_string(data, field)
    if value not in choices:
        raise RuntimeContractError(f"{field} must be one of: {', '.join(choices)}")
    return value


def _string_list(data: dict[str, Any], field: str, *, required: bool = False) -> list[str]:
    value = data.get(field, [])
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        raise RuntimeContractError(f"{field} must be a list of non-empty strings")
    result = [item.strip() for item in value]
    if required and not result:
        raise RuntimeContractError(f"{field} must contain at least one item")
    if len(set(result)) != len(result):
        raise RuntimeContractError(f"{field} must not contain duplicates")
    return result


def _base(kind: str, data: dict[str, Any]) -> dict[str, Any]:
    expected_prefix = f"{ID_PREFIXES[kind]}_"
    receipt_id = data.get("id") or _new_id(kind)
    if not isinstance(receipt_id, str) or not receipt_id.startswith(expected_prefix):
        raise RuntimeContractError(f"id for {kind} must start with {expected_prefix}")
    created_at = data.get("created_at") or _now()
    if not isinstance(created_at, str) or not created_at.strip():
        raise RuntimeContractError("created_at must be a non-empty ISO-8601 string")
    return {
        "schema_version": SCHEMA_VERSION,
        "kind": kind,
        "id": receipt_id,
        "created_at": created_at,
    }


def init_runtime(repo_root: Path) -> list[Path]:
    """Create runtime directories and a machine-operable state projection."""
    root = _runtime_root(repo_root)
    created: list[Path] = []
    for directory in RECEIPT_DIRS.values():
        path = root / "receipts" / directory
        if not path.exists():
            path.mkdir(parents=True, exist_ok=True)
            created.append(path)

    manifest = root / "manifest.json"
    if not manifest.exists():
        _write_json(
            manifest,
            {
                "schema_version": SCHEMA_VERSION,
                "authority_model": "proposal-plus-explicit-decision",
                "state_projection": "state.json",
                "receipts": RECEIPT_DIRS,
            },
        )
        created.append(manifest)

    state = _state_path(repo_root)
    if not state.exists():
        _write_json(
            state,
            {
                "schema_version": SCHEMA_VERSION,
                "revision": 0,
                "updated_at": None,
                "concepts": {},
            },
        )
        created.append(state)
    return created


def _write_json(path: Path, data: dict[str, Any], *, immutable: bool = False) -> None:
    if immutable and path.exists():
        raise RuntimeContractError(f"receipt already exists and is immutable: {path.name}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def _read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeContractError(f"cannot read valid JSON from {path}") from exc
    if not isinstance(data, dict):
        raise RuntimeContractError(f"JSON object expected in {path}")
    return data


def load_receipt(repo_root: Path, kind: str, receipt_id: str) -> dict[str, Any]:
    path = _receipt_root(repo_root, kind) / f"{receipt_id}.json"
    if not path.is_file():
        raise RuntimeContractError(f"unknown {kind} receipt: {receipt_id}")
    return _read_json(path)


def list_receipts(repo_root: Path, kind: str) -> list[dict[str, Any]]:
    root = _receipt_root(repo_root, kind)
    if not root.is_dir():
        return []
    receipts = [_read_json(path) for path in root.glob("*.json")]
    return sorted(receipts, key=lambda item: (str(item.get("created_at", "")), str(item.get("id", ""))))


def _require_refs(repo_root: Path, kind: str, ids: list[str]) -> None:
    for receipt_id in ids:
        load_receipt(repo_root, kind, receipt_id)


def _save(repo_root: Path, kind: str, receipt: dict[str, Any]) -> dict[str, Any]:
    init_runtime(repo_root)
    path = _receipt_root(repo_root, kind) / f"{receipt['id']}.json"
    _write_json(path, receipt, immutable=True)
    return receipt


def record_decision(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    receipt = _base("decision", data)
    evidence_used = _string_list(data, "evidence_used")
    _require_refs(repo_root, "evidence", evidence_used)
    representation = data.get("representation")
    if not isinstance(representation, dict):
        raise RuntimeContractError("representation must be an object")
    receipt.update(
        {
            "mode": _enum(data, "mode", ("teach", "study")),
            "target": _required_string(data, "target"),
            "frontier_hypothesis": _required_string(data, "frontier_hypothesis"),
            "evidence_used": evidence_used,
            "uncertainty": _enum(data, "uncertainty", ("low", "medium", "high")),
            "move": _enum(data, "move", MOVE_TYPES),
            "rationale": _required_string(data, "rationale"),
            "learner_action": _required_string(data, "learner_action"),
            "representation": {
                "kind": _required_string(representation, "kind"),
                "purpose": _required_string(representation, "purpose"),
                **({"artifact_ref": representation["artifact_ref"]} if representation.get("artifact_ref") else {}),
            },
            "expected_evidence": _required_string(data, "expected_evidence"),
            "falsification_signal": _required_string(data, "falsification_signal"),
        }
    )
    return _save(repo_root, "decision", receipt)


def record_observation(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    receipt = _base("observation", data)
    decision_id = _required_string(data, "decision_id")
    load_receipt(repo_root, "decision", decision_id)
    receipt.update(
        {
            "decision_id": decision_id,
            "concept_ids": _string_list(data, "concept_ids", required=True),
            "learner_action": _required_string(data, "learner_action"),
            "observed_result": _required_string(data, "observed_result"),
            "source": _enum(data, "source", ("learner", "tool", "assessor")),
        }
    )
    excerpt = _optional_string(data, "excerpt")
    if excerpt:
        receipt["excerpt"] = excerpt
    return _save(repo_root, "observation", receipt)


def record_evidence(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    receipt = _base("evidence", data)
    observation_id = _required_string(data, "observation_id")
    observation = load_receipt(repo_root, "observation", observation_id)
    concept_ids = _string_list(data, "concept_ids", required=True)
    if not set(concept_ids).issubset(set(observation["concept_ids"])):
        raise RuntimeContractError("evidence concept_ids must be present on the observation")
    receipt.update(
        {
            "observation_id": observation_id,
            "concept_ids": concept_ids,
            "level": _enum(data, "level", EVIDENCE_LEVELS),
            "outcome": _enum(data, "outcome", ("supports", "contradicts", "inconclusive")),
            "result_summary": _required_string(data, "result_summary"),
            "scaffolding": _enum(data, "scaffolding", ("none", "light", "heavy")),
            "context": _enum(data, "context", ("same", "varied", "novel")),
            "delay": _enum(data, "delay", ("immediate", "delayed")),
            "independence": _enum(data, "independence", ("same_form", "new_form", "independent")),
            "supports": _string_list(data, "supports"),
            "contradicts": _string_list(data, "contradicts"),
            "confidence": _enum(data, "confidence", ("low", "medium", "high")),
            "assessor": _required_string(data, "assessor"),
        }
    )
    return _save(repo_root, "evidence", receipt)


def record_state_proposal(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    receipt = _base("state-proposal", data)
    before = _enum(data, "before", MASTERY_STATES)
    after = _enum(data, "after", MASTERY_STATES)
    if before == after:
        raise RuntimeContractError("state proposal must change the concept state")
    evidence_ids = _string_list(data, "evidence_ids", required=True)
    evidence = [load_receipt(repo_root, "evidence", item) for item in evidence_ids]
    concept_id = _required_string(data, "concept_id")
    if any(concept_id not in item["concept_ids"] for item in evidence):
        raise RuntimeContractError("all proposal evidence must reference concept_id")
    receipt.update(
        {
            "concept_id": concept_id,
            "concept_label": _required_string(data, "concept_label"),
            "before": before,
            "after": after,
            "evidence_ids": evidence_ids,
            "rationale": _required_string(data, "rationale"),
            "proposed_by": _required_string(data, "proposed_by"),
        }
    )
    return _save(repo_root, "state-proposal", receipt)


def transition_policy_issues(repo_root: Path, proposal: dict[str, Any]) -> list[str]:
    """Return safety issues; qualitative sufficiency still requires authority."""
    before = proposal["before"]
    after = proposal["after"]
    before_rank = MASTERY_STATES.index(before)
    after_rank = MASTERY_STATES.index(after)
    evidence = [load_receipt(repo_root, "evidence", item) for item in proposal["evidence_ids"]]
    supporting = [item for item in evidence if item["outcome"] == "supports"]
    contradicting = [item for item in evidence if item["outcome"] == "contradicts"]
    issues: list[str] = []

    if after_rank > before_rank + 1:
        issues.append("mastery promotion cannot skip states")
    if after_rank > before_rank and not supporting:
        issues.append("mastery promotion requires supporting evidence")
    if after_rank < before_rank and not contradicting:
        issues.append("mastery downgrade requires contradicting evidence")

    if after == "stable":
        signatures = {
            (item["context"], item["delay"], item["independence"])
            for item in supporting
            if item["scaffolding"] in ("none", "light")
            and EVIDENCE_LEVELS.index(item["level"]) >= EVIDENCE_LEVELS.index("recall")
        }
        if len(supporting) < 2:
            issues.append("stable requires at least two supporting evidence receipts")
        if len(signatures) < 2:
            issues.append("stable requires two meaningfully independent, lightly scaffolded signals")

    if after == "transferable":
        has_transfer = any(
            item["level"] == "transfer"
            and item["context"] == "novel"
            and item["scaffolding"] in ("none", "light")
            for item in supporting
        )
        if not has_transfer:
            issues.append("transferable requires lightly scaffolded transfer in a novel context")
    return issues


def _current_state(repo_root: Path) -> dict[str, Any]:
    init_runtime(repo_root)
    return _read_json(_state_path(repo_root))


def decide_state_proposal(
    repo_root: Path,
    proposal_id: str,
    decision: str,
    authority_type: str,
    authority_id: str,
    reason: str,
    *,
    override_policy: bool = False,
    receipt_id: str | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    if decision not in ("accepted", "rejected"):
        raise RuntimeContractError("decision must be accepted or rejected")
    if authority_type not in ("learner", "human_reviewer", "runtime_policy"):
        raise RuntimeContractError("agents may propose state changes but cannot accept them as authority")
    if not authority_id.strip() or not reason.strip():
        raise RuntimeContractError("authority_id and reason are required")
    proposal = load_receipt(repo_root, "state-proposal", proposal_id)
    previous = [item for item in list_receipts(repo_root, "state-decision") if item["proposal_id"] == proposal_id]
    if previous:
        raise RuntimeContractError(f"proposal already has a state decision: {previous[0]['id']}")

    issues = transition_policy_issues(repo_root, proposal) if decision == "accepted" else []
    if issues and not override_policy:
        raise RuntimeContractError("transition policy rejected acceptance: " + "; ".join(issues))
    if override_policy and authority_type == "runtime_policy":
        raise RuntimeContractError("runtime_policy cannot override its own safety checks")

    data: dict[str, Any] = {"id": receipt_id, "created_at": created_at}
    receipt = _base("state-decision", {key: value for key, value in data.items() if value is not None})
    receipt.update(
        {
            "proposal_id": proposal_id,
            "decision": decision,
            "authority": {"type": authority_type, "id": authority_id},
            "reason": reason,
            "policy_issues": issues,
            "policy_overridden": bool(issues and override_policy),
        }
    )

    if decision == "accepted":
        state = _current_state(repo_root)
        existing = state["concepts"].get(proposal["concept_id"])
        current = existing["state"] if existing else "unknown"
        if current != proposal["before"]:
            raise RuntimeContractError(
                f"stale state proposal: expected {proposal['before']}, current projection is {current}"
            )
        receipt["projection_revision"] = state["revision"] + 1
        receipt = _save(repo_root, "state-decision", receipt)
        state["revision"] += 1
        state["updated_at"] = receipt["created_at"]
        state["concepts"][proposal["concept_id"]] = {
            "label": proposal["concept_label"],
            "state": proposal["after"],
            "evidence_ids": proposal["evidence_ids"],
            "proposal_id": proposal_id,
            "decision_id": receipt["id"],
        }
        _write_json(_state_path(repo_root), state)
        return receipt

    return _save(repo_root, "state-decision", receipt)


def record_turn(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    receipt = _base("turn", data)
    decision_id = _required_string(data, "decision_id")
    load_receipt(repo_root, "decision", decision_id)
    refs = {
        "observation_ids": ("observation", _string_list(data, "observation_ids")),
        "evidence_ids": ("evidence", _string_list(data, "evidence_ids")),
        "state_proposal_ids": ("state-proposal", _string_list(data, "state_proposal_ids")),
        "state_decision_ids": ("state-decision", _string_list(data, "state_decision_ids")),
    }
    for _, (kind, values) in refs.items():
        _require_refs(repo_root, kind, values)
    observations = [load_receipt(repo_root, "observation", item) for item in refs["observation_ids"][1]]
    evidence = [load_receipt(repo_root, "evidence", item) for item in refs["evidence_ids"][1]]
    proposals = [load_receipt(repo_root, "state-proposal", item) for item in refs["state_proposal_ids"][1]]
    state_decisions = [load_receipt(repo_root, "state-decision", item) for item in refs["state_decision_ids"][1]]
    observation_ids = {item["id"] for item in observations}
    evidence_ids = {item["id"] for item in evidence}
    proposal_ids = {item["id"] for item in proposals}
    if any(item["decision_id"] != decision_id for item in observations):
        raise RuntimeContractError("all turn observations must reference its decision_id")
    if any(item["observation_id"] not in observation_ids for item in evidence):
        raise RuntimeContractError("turn evidence must reference an observation in the same turn")
    if any(not set(item["evidence_ids"]).issubset(evidence_ids) for item in proposals):
        raise RuntimeContractError("turn state proposals must use evidence in the same turn")
    if any(item["proposal_id"] not in proposal_ids for item in state_decisions):
        raise RuntimeContractError("turn state decisions must reference a proposal in the same turn")
    receipt.update(
        {
            "decision_id": decision_id,
            **{field: values for field, (_, values) in refs.items()},
            "artifact_refs": _string_list(data, "artifact_refs"),
            "outcome": _enum(data, "outcome", ("completed", "awaiting_evidence", "abandoned")),
            "summary": _required_string(data, "summary"),
        }
    )
    return _save(repo_root, "turn", receipt)


def rebuild_state(repo_root: Path) -> dict[str, Any]:
    """Derive the state projection from accepted immutable receipts."""
    state: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "revision": 0,
        "updated_at": None,
        "concepts": {},
    }
    accepted = [
        item for item in list_receipts(repo_root, "state-decision")
        if item.get("decision") == "accepted"
    ]
    accepted.sort(key=lambda item: int(item.get("projection_revision", 0)))
    for expected_revision, decision in enumerate(accepted, start=1):
        if decision.get("projection_revision") != expected_revision:
            raise RuntimeContractError(
                f"accepted state decisions must have contiguous projection revisions; expected {expected_revision}"
            )
        proposal = load_receipt(repo_root, "state-proposal", str(decision.get("proposal_id")))
        existing = state["concepts"].get(proposal["concept_id"])
        current = existing["state"] if existing else "unknown"
        if current != proposal["before"]:
            raise RuntimeContractError(
                f"accepted receipt chain is stale at {decision['id']}: expected {proposal['before']}, current {current}"
            )
        state["revision"] += 1
        state["updated_at"] = decision["created_at"]
        state["concepts"][proposal["concept_id"]] = {
            "label": proposal["concept_label"],
            "state": proposal["after"],
            "evidence_ids": proposal["evidence_ids"],
            "proposal_id": proposal["id"],
            "decision_id": decision["id"],
        }
    return state


RECORDERS: dict[str, Callable[[Path, dict[str, Any]], dict[str, Any]]] = {
    "decision": record_decision,
    "observation": record_observation,
    "evidence": record_evidence,
    "state-proposal": record_state_proposal,
    "turn": record_turn,
}


def verify_runtime(repo_root: Path) -> list[str]:
    """Validate every stored receipt and important cross-receipt invariants."""
    problems: list[str] = []
    for kind in RECEIPT_DIRS:
        try:
            receipts = list_receipts(repo_root, kind)
        except RuntimeContractError as exc:
            problems.append(str(exc))
            continue
        for receipt in receipts:
            if receipt.get("schema_version") != SCHEMA_VERSION:
                problems.append(f"{receipt.get('id', 'unknown')}: unsupported schema_version")
            if receipt.get("kind") != kind:
                problems.append(f"{receipt.get('id', 'unknown')}: kind/path mismatch")
    decisions = {item["id"] for item in list_receipts(repo_root, "decision")}
    observations = {item["id"]: item for item in list_receipts(repo_root, "observation")}
    evidence = {item["id"]: item for item in list_receipts(repo_root, "evidence")}
    proposals = {item["id"]: item for item in list_receipts(repo_root, "state-proposal")}
    state_decisions = list_receipts(repo_root, "state-decision")
    for item in observations.values():
        if item.get("decision_id") not in decisions:
            problems.append(f"{item['id']}: missing decision {item.get('decision_id')}")
    for item in evidence.values():
        if item.get("observation_id") not in observations:
            problems.append(f"{item['id']}: missing observation {item.get('observation_id')}")
    for item in proposals.values():
        missing = set(item.get("evidence_ids", [])) - evidence.keys()
        if missing:
            problems.append(f"{item['id']}: missing evidence {', '.join(sorted(missing))}")
    seen_proposals: set[str] = set()
    for item in state_decisions:
        proposal_id = item.get("proposal_id")
        if proposal_id not in proposals:
            problems.append(f"{item['id']}: missing proposal {proposal_id}")
        if proposal_id in seen_proposals:
            problems.append(f"{item['id']}: duplicate decision for proposal {proposal_id}")
        seen_proposals.add(proposal_id)
    try:
        projected = rebuild_state(repo_root)
        stored = _current_state(repo_root)
        if projected != stored:
            problems.append("state.json does not match the accepted receipt chain")
    except RuntimeContractError as exc:
        problems.append(str(exc))
    return problems


def _load_payload(path: str) -> dict[str, Any]:
    if path == "-":
        data = json.load(sys.stdin)
    else:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeContractError("payload must be a JSON object")
    return data


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ai4learning structured transaction runtime")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="repository root")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init", help="initialize the local runtime ledger")
    record = sub.add_parser("record", help="record an immutable structured receipt")
    record.add_argument("kind", choices=tuple(RECORDERS))
    record.add_argument("payload", help="JSON file or - for stdin")
    decide = sub.add_parser("decide", help="accept or reject a state proposal")
    decide.add_argument("proposal_id")
    decide.add_argument("decision", choices=("accepted", "rejected"))
    decide.add_argument("authority_type", choices=("learner", "human_reviewer", "runtime_policy"))
    decide.add_argument("authority_id")
    decide.add_argument("reason")
    decide.add_argument("--override-policy", action="store_true")
    sub.add_parser("state", help="print the current machine-operable state projection")
    sub.add_parser("verify", help="verify the ledger and its references")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    repo_root = args.repo.resolve()
    try:
        if args.command == "init":
            created = init_runtime(repo_root)
            print(f"Runtime ready ({len(created)} item(s) created).")
        elif args.command == "record":
            receipt = RECORDERS[args.kind](repo_root, _load_payload(args.payload))
            print(json.dumps(receipt, ensure_ascii=False, indent=2))
        elif args.command == "decide":
            receipt = decide_state_proposal(
                repo_root,
                args.proposal_id,
                args.decision,
                args.authority_type,
                args.authority_id,
                args.reason,
                override_policy=args.override_policy,
            )
            print(json.dumps(receipt, ensure_ascii=False, indent=2))
        elif args.command == "state":
            print(json.dumps(_current_state(repo_root), ensure_ascii=False, indent=2))
        elif args.command == "verify":
            problems = verify_runtime(repo_root)
            if problems:
                print("Runtime verification failed:")
                for problem in problems:
                    print(f"  - {problem}")
                return 1
            print("Runtime ledger verification passed.")
        return 0
    except (OSError, json.JSONDecodeError, RuntimeContractError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
