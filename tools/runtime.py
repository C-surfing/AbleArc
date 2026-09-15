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
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

SCHEMA_VERSION = "0.1"
ARTIFACT_SCHEMA_VERSION = "0.2"
SUPPORTED_ARTIFACT_SCHEMA_VERSIONS = ("0.1", "0.2")
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
ID_PATTERN = re.compile(r"^[a-z]+_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$")
ARTIFACT_ID_PATTERN = re.compile(r"^art_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$")
OPTION_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_-]{0,31}$")


def _default_frequency_prediction() -> dict[str, Any]:
    return {
        "prompt": "Before revealing the counts: if prevalence falls while the test stays the same, what happens to the posterior after a positive result?",
        "options": [
            {"id": "falls", "label": "It falls"},
            {"id": "stays", "label": "It stays the same"},
            {"id": "rises", "label": "It rises"},
        ],
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


def _artifact_root(repo_root: Path) -> Path:
    return repo_root / ".learning" / "artifacts"


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
    if (
        not isinstance(receipt_id, str)
        or not receipt_id.startswith(expected_prefix)
        or not ID_PATTERN.fullmatch(receipt_id)
    ):
        raise RuntimeContractError(
            f"id for {kind} must start with {expected_prefix} and contain only letters, numbers, _ or -"
        )
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

    artifacts = _artifact_root(repo_root)
    if not artifacts.exists():
        artifacts.mkdir(parents=True, exist_ok=True)
        created.append(artifacts)

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


def _probability(data: dict[str, Any], field: str) -> float:
    value = data.get(field)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= value <= 1:
        raise RuntimeContractError(f"{field} must be a number between 0 and 1")
    return float(value)


def record_learning_artifact(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    """Persist a typed cognitive instrument outside the learner-state ledger."""
    artifact_id = data.get("id") or f"art_{uuid.uuid4().hex[:16]}"
    if not isinstance(artifact_id, str) or not ARTIFACT_ID_PATTERN.fullmatch(artifact_id):
        raise RuntimeContractError("artifact id must start with art_ and contain only letters, numbers, _ or -")
    renderer = _enum(data, "renderer", ("frequency_tree_v1",))
    payload = data.get("payload")
    if not isinstance(payload, dict):
        raise RuntimeContractError("artifact payload must be an object")
    population = payload.get("population")
    if not isinstance(population, int) or isinstance(population, bool) or not 100 <= population <= 1_000_000:
        raise RuntimeContractError("population must be an integer between 100 and 1000000")
    prevalence = _probability(payload, "prevalence")
    sensitivity = _probability(payload, "sensitivity")
    false_positive_rate = _probability(payload, "false_positive_rate")
    prevalence_min = _probability(payload, "prevalence_min")
    prevalence_max = _probability(payload, "prevalence_max")
    prevalence_step = _probability(payload, "prevalence_step")
    if not prevalence_min < prevalence_max:
        raise RuntimeContractError("prevalence_min must be smaller than prevalence_max")
    if not prevalence_min <= prevalence <= prevalence_max:
        raise RuntimeContractError("prevalence must fall inside the configured range")
    if prevalence_step <= 0 or prevalence_step > prevalence_max - prevalence_min:
        raise RuntimeContractError("prevalence_step must be positive and no larger than the configured range")

    labels = payload.get("labels")
    if not isinstance(labels, dict):
        raise RuntimeContractError("artifact payload labels must be an object")
    prediction = data.get("prediction")
    if not isinstance(prediction, dict):
        raise RuntimeContractError("artifact prediction must be an object")
    options = prediction.get("options")
    if not isinstance(options, list) or not 2 <= len(options) <= 5:
        raise RuntimeContractError("artifact prediction must contain between two and five options")
    normalized_options: list[dict[str, str]] = []
    option_ids: set[str] = set()
    for option in options:
        if not isinstance(option, dict):
            raise RuntimeContractError("each prediction option must be an object")
        option_id = _required_string(option, "id")
        if not OPTION_ID_PATTERN.fullmatch(option_id) or option_id in option_ids:
            raise RuntimeContractError("prediction option ids must be unique lowercase identifiers")
        option_ids.add(option_id)
        normalized_options.append({"id": option_id, "label": _required_string(option, "label")})
    created_at = data.get("created_at") or _now()
    if not isinstance(created_at, str) or not created_at.strip():
        raise RuntimeContractError("artifact created_at must be a non-empty ISO-8601 string")
    artifact = {
        "schema_version": ARTIFACT_SCHEMA_VERSION,
        "kind": "learning-artifact",
        "id": artifact_id,
        "created_at": created_at,
        "renderer": renderer,
        "title": _required_string(data, "title"),
        "concept_ids": _string_list(data, "concept_ids", required=True),
        "learning_goal": _required_string(data, "learning_goal"),
        "inference_prompt": _required_string(data, "inference_prompt"),
        "success_evidence": _required_string(data, "success_evidence"),
        "authored_by": _required_string(data, "authored_by"),
        "prediction": {
            "prompt": _required_string(prediction, "prompt"),
            "options": normalized_options,
        },
        "payload": {
            "population": population,
            "prevalence": prevalence,
            "sensitivity": sensitivity,
            "false_positive_rate": false_positive_rate,
            "prevalence_min": prevalence_min,
            "prevalence_max": prevalence_max,
            "prevalence_step": prevalence_step,
            "labels": {
                "population": _required_string(labels, "population"),
                "condition": _required_string(labels, "condition"),
                "complement": _required_string(labels, "complement"),
                "positive": _required_string(labels, "positive"),
                "false_positive": _required_string(labels, "false_positive"),
            },
        },
    }
    path = _artifact_root(repo_root) / f"{artifact_id}.json"
    _write_json(path, artifact, immutable=True)
    return artifact


def load_learning_artifact(repo_root: Path, artifact_ref: str) -> dict[str, Any]:
    expected_prefix = ".learning/artifacts/"
    name = artifact_ref[len(expected_prefix):] if artifact_ref.startswith(expected_prefix) else artifact_ref
    if name.endswith(".json"):
        name = name[:-5]
    if not ARTIFACT_ID_PATTERN.fullmatch(name):
        raise RuntimeContractError("artifact_ref must identify a local typed learning artifact")
    path = _artifact_root(repo_root) / f"{name}.json"
    if not path.is_file():
        raise RuntimeContractError(f"unknown learning artifact: {name}")
    artifact = _read_json(path)
    version = artifact.get("schema_version")
    if version not in SUPPORTED_ARTIFACT_SCHEMA_VERSIONS or artifact.get("kind") != "learning-artifact":
        raise RuntimeContractError(f"unsupported learning artifact: {name}")
    if artifact.get("id") != name:
        raise RuntimeContractError(f"learning artifact id/path mismatch: {name}")
    _required_string(artifact, "created_at")
    _enum(artifact, "renderer", ("frequency_tree_v1",))
    _required_string(artifact, "title")
    _string_list(artifact, "concept_ids", required=True)
    _required_string(artifact, "learning_goal")
    _required_string(artifact, "inference_prompt")
    _required_string(artifact, "success_evidence")
    _required_string(artifact, "authored_by")
    prediction = artifact.get("prediction")
    if version == "0.1" and prediction is None:
        artifact = {**artifact, "prediction": _default_frequency_prediction()}
        prediction = artifact["prediction"]
    if not isinstance(prediction, dict):
        raise RuntimeContractError("artifact prediction must be an object")
    _required_string(prediction, "prompt")
    options = prediction.get("options")
    if not isinstance(options, list) or not 2 <= len(options) <= 5:
        raise RuntimeContractError("artifact prediction must contain between two and five options")
    option_ids: set[str] = set()
    for option in options:
        if not isinstance(option, dict):
            raise RuntimeContractError("each prediction option must be an object")
        option_id = _required_string(option, "id")
        if not OPTION_ID_PATTERN.fullmatch(option_id) or option_id in option_ids:
            raise RuntimeContractError("prediction option ids must be unique lowercase identifiers")
        option_ids.add(option_id)
        _required_string(option, "label")
    payload = artifact.get("payload")
    if not isinstance(payload, dict):
        raise RuntimeContractError("artifact payload must be an object")
    population = payload.get("population")
    if not isinstance(population, int) or isinstance(population, bool) or not 100 <= population <= 1_000_000:
        raise RuntimeContractError("population must be an integer between 100 and 1000000")
    prevalence = _probability(payload, "prevalence")
    prevalence_min = _probability(payload, "prevalence_min")
    prevalence_max = _probability(payload, "prevalence_max")
    prevalence_step = _probability(payload, "prevalence_step")
    _probability(payload, "sensitivity")
    _probability(payload, "false_positive_rate")
    if not prevalence_min < prevalence_max or not prevalence_min <= prevalence <= prevalence_max:
        raise RuntimeContractError("artifact prevalence range is inconsistent")
    if prevalence_step <= 0 or prevalence_step > prevalence_max - prevalence_min:
        raise RuntimeContractError("artifact prevalence_step is inconsistent")
    labels = payload.get("labels")
    if not isinstance(labels, dict):
        raise RuntimeContractError("artifact payload labels must be an object")
    for field in ("population", "condition", "complement", "positive", "false_positive"):
        _required_string(labels, field)
    return artifact


def _prepare_decision(
    repo_root: Path,
    data: dict[str, Any],
    *,
    available_evidence_ids: set[str] | None = None,
) -> dict[str, Any]:
    receipt = _base("decision", data)
    evidence_used = _string_list(data, "evidence_used")
    available = available_evidence_ids or set()
    _require_refs(repo_root, "evidence", [item for item in evidence_used if item not in available])
    representation = data.get("representation")
    if not isinstance(representation, dict):
        raise RuntimeContractError("representation must be an object")
    concept_ids = _string_list(data, "concept_ids", required=True)
    artifact_ref = _optional_string(representation, "artifact_ref")
    if artifact_ref:
        artifact = load_learning_artifact(repo_root, artifact_ref)
        if not set(concept_ids).intersection(artifact["concept_ids"]):
            raise RuntimeContractError("decision and learning artifact must share at least one concept_id")
        artifact_ref = f".learning/artifacts/{artifact['id']}.json"
    receipt.update(
        {
            "mode": _enum(data, "mode", ("teach", "study")),
            "target": _required_string(data, "target"),
            "concept_ids": concept_ids,
            "frontier_hypothesis": _required_string(data, "frontier_hypothesis"),
            "evidence_used": evidence_used,
            "uncertainty": _enum(data, "uncertainty", ("low", "medium", "high")),
            "move": _enum(data, "move", MOVE_TYPES),
            "rationale": _required_string(data, "rationale"),
            "learner_action": _required_string(data, "learner_action"),
            "representation": {
                "kind": _required_string(representation, "kind"),
                "purpose": _required_string(representation, "purpose"),
                **({"artifact_ref": artifact_ref} if artifact_ref else {}),
            },
            "expected_evidence": _required_string(data, "expected_evidence"),
            "falsification_signal": _required_string(data, "falsification_signal"),
        }
    )
    return receipt


def record_decision(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    return _save(repo_root, "decision", _prepare_decision(repo_root, data))


def record_observation(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    receipt = _base("observation", data)
    decision_id = _required_string(data, "decision_id")
    decision = load_receipt(repo_root, "decision", decision_id)
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
    interaction = data.get("artifact_interaction")
    if interaction is not None:
        receipt["artifact_interaction"] = _validate_artifact_interaction(repo_root, decision, interaction)
    return _save(repo_root, "observation", receipt)


def _validate_artifact_interaction(
    repo_root: Path,
    decision: dict[str, Any],
    interaction: Any,
) -> dict[str, Any]:
    if not isinstance(interaction, dict):
        raise RuntimeContractError("artifact_interaction must be an object")
    representation = decision.get("representation")
    artifact_ref = representation.get("artifact_ref") if isinstance(representation, dict) else None
    if not isinstance(artifact_ref, str):
        raise RuntimeContractError("decision does not have an interactive learning artifact")
    artifact = load_learning_artifact(repo_root, artifact_ref)
    artifact_id = _required_string(interaction, "artifact_id")
    if artifact_id != artifact["id"]:
        raise RuntimeContractError("artifact_interaction does not match the decision artifact")
    prediction_id = _required_string(interaction, "prediction_id")
    valid_options = {item["id"] for item in artifact["prediction"]["options"]}
    if prediction_id not in valid_options:
        raise RuntimeContractError("artifact_interaction prediction_id is not an available option")
    initial_prevalence = _probability(interaction, "initial_prevalence")
    final_prevalence = _probability(interaction, "final_prevalence")
    payload = artifact["payload"]
    if abs(initial_prevalence - payload["prevalence"]) > 1e-9:
        raise RuntimeContractError("artifact_interaction initial_prevalence does not match the artifact")
    if not payload["prevalence_min"] <= final_prevalence <= payload["prevalence_max"]:
        raise RuntimeContractError("artifact_interaction final_prevalence is outside the artifact range")
    return {
        "artifact_id": artifact_id,
        "prediction_id": prediction_id,
        "initial_prevalence": initial_prevalence,
        "final_prevalence": final_prevalence,
    }


def record_learner_response(
    repo_root: Path,
    decision_id: str,
    response: str,
    *,
    artifact_interaction: dict[str, Any] | None = None,
    receipt_id: str | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    """User-facing façade: capture one response without exposing receipt fields."""
    response = response.strip()
    if not response:
        raise RuntimeContractError("learner response must not be empty")
    if len(response) > 12000:
        raise RuntimeContractError("learner response must be 12000 characters or fewer")
    decision = load_receipt(repo_root, "decision", decision_id)
    previous = [
        item
        for item in list_receipts(repo_root, "observation")
        if item.get("decision_id") == decision_id and item.get("source") == "learner"
    ]
    if previous:
        raise RuntimeContractError(f"decision already has a learner response: {previous[-1]['id']}")
    return record_observation(
        repo_root,
        {
            **({"id": receipt_id} if receipt_id else {}),
            **({"created_at": created_at} if created_at else {}),
            "decision_id": decision_id,
            "concept_ids": decision["concept_ids"],
            "learner_action": decision["learner_action"],
            "observed_result": response,
            "source": "learner",
            **({"artifact_interaction": artifact_interaction} if artifact_interaction is not None else {}),
        },
    )


def _prepare_evidence(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
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
    return receipt


def record_evidence(repo_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    return _save(repo_root, "evidence", _prepare_evidence(repo_root, data))


def _learner_observation_for_decision(repo_root: Path, decision_id: str) -> dict[str, Any]:
    matches = [
        item
        for item in list_receipts(repo_root, "observation")
        if item.get("decision_id") == decision_id and item.get("source") == "learner"
    ]
    if not matches:
        raise RuntimeContractError(f"decision has no learner response: {decision_id}")
    return matches[-1]


def pending_learner_turn(repo_root: Path) -> dict[str, Any] | None:
    """Return the newest learner response that still needs an agent assessment."""
    assessed_observations = {
        item.get("observation_id") for item in list_receipts(repo_root, "evidence")
    }
    pending = [
        item
        for item in list_receipts(repo_root, "observation")
        if item.get("source") == "learner" and item.get("id") not in assessed_observations
    ]
    if not pending:
        return None
    observation = pending[-1]
    decision = load_receipt(repo_root, "decision", observation["decision_id"])
    return {
        "decision": decision,
        "observation": observation,
        "learner_state": _current_state(repo_root),
    }


def advance_learning_turn(
    repo_root: Path,
    decision_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Agent-facing façade: assess one response, close its turn, and issue the next move.

    This deliberately reuses EvidenceReceipt, TurnReceipt, and DecisionProposal.
    The compact input is an integration boundary; it is not a seventh receipt type.
    """
    current_decision = load_receipt(repo_root, "decision", decision_id)
    observation = _learner_observation_for_decision(repo_root, decision_id)
    previous_assessments = [
        item
        for item in list_receipts(repo_root, "evidence")
        if item.get("observation_id") == observation["id"]
    ]
    if previous_assessments:
        raise RuntimeContractError(
            f"learner response already has an assessment: {previous_assessments[-1]['id']}"
        )

    assessment = data.get("assessment")
    next_move = data.get("next_decision")
    if not isinstance(assessment, dict):
        raise RuntimeContractError("assessment must be an object")
    if not isinstance(next_move, dict):
        raise RuntimeContractError("next_decision must be an object")

    evidence_id = data.get("evidence_id") or _new_id("evidence")
    evidence_data = {
        **assessment,
        "id": evidence_id,
        "observation_id": observation["id"],
        "concept_ids": observation["concept_ids"],
    }
    prepared_evidence = _prepare_evidence(repo_root, evidence_data)

    requested_evidence = _string_list(next_move, "evidence_used")
    evidence_used = list(dict.fromkeys([*requested_evidence, evidence_id]))
    next_data = {
        **next_move,
        "mode": next_move.get("mode", current_decision["mode"]),
        "concept_ids": next_move.get("concept_ids", current_decision["concept_ids"]),
        "evidence_used": evidence_used,
    }
    prepared_next = _prepare_decision(
        repo_root,
        next_data,
        available_evidence_ids={evidence_id},
    )

    evidence = _save(repo_root, "evidence", prepared_evidence)
    next_decision = _save(repo_root, "decision", prepared_next)
    representation = current_decision.get("representation", {})
    artifact_refs = []
    if isinstance(representation, dict) and isinstance(representation.get("artifact_ref"), str):
        artifact_refs.append(representation["artifact_ref"])
    turn = record_turn(
        repo_root,
        {
            **({"id": data["turn_id"]} if data.get("turn_id") else {}),
            "decision_id": decision_id,
            "observation_ids": [observation["id"]],
            "evidence_ids": [evidence["id"]],
            "state_proposal_ids": [],
            "state_decision_ids": [],
            "artifact_refs": artifact_refs,
            "outcome": "completed",
            "summary": evidence["result_summary"],
        },
    )
    return {"evidence": evidence, "turn": turn, "next_decision": next_decision}


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
    decisions = {item["id"]: item for item in list_receipts(repo_root, "decision")}
    observations = {item["id"]: item for item in list_receipts(repo_root, "observation")}
    evidence = {item["id"]: item for item in list_receipts(repo_root, "evidence")}
    proposals = {item["id"]: item for item in list_receipts(repo_root, "state-proposal")}
    state_decisions = list_receipts(repo_root, "state-decision")
    for item in observations.values():
        if item.get("decision_id") not in decisions:
            problems.append(f"{item['id']}: missing decision {item.get('decision_id')}")
    for item in decisions.values():
        representation = item.get("representation", {})
        artifact_ref = representation.get("artifact_ref") if isinstance(representation, dict) else None
        if artifact_ref:
            try:
                load_learning_artifact(repo_root, artifact_ref)
            except RuntimeContractError as exc:
                problems.append(f"{item['id']}: {exc}")
    artifact_root = _artifact_root(repo_root)
    if artifact_root.is_dir():
        for path in artifact_root.glob("*.json"):
            try:
                load_learning_artifact(repo_root, path.name)
            except RuntimeContractError as exc:
                problems.append(str(exc))
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
    respond = sub.add_parser("respond", help="record one learner response to a decision")
    respond.add_argument("decision_id")
    respond.add_argument("response", help="response text or - for stdin")
    respond_context = sub.add_parser("respond-context", help="record a response with artifact interaction context")
    respond_context.add_argument("decision_id")
    respond_context.add_argument("payload", help="response/context JSON file or - for stdin")
    sub.add_parser("pending", help="print the newest learner response awaiting assessment")
    advance = sub.add_parser("advance", help="assess a response and issue the next learning move")
    advance.add_argument("decision_id")
    advance.add_argument("payload", help="compact assessment/next-decision JSON file or - for stdin")
    artifact = sub.add_parser("artifact", help="validate and store a typed learning artifact")
    artifact.add_argument("payload", help="learning artifact JSON file or - for stdin")
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
        elif args.command == "respond":
            response = sys.stdin.read() if args.response == "-" else args.response
            receipt = record_learner_response(repo_root, args.decision_id, response)
            print(json.dumps(receipt, ensure_ascii=False, indent=2))
        elif args.command == "respond-context":
            payload = _load_payload(args.payload)
            receipt = record_learner_response(
                repo_root,
                args.decision_id,
                _required_string(payload, "response"),
                artifact_interaction=payload.get("artifact_interaction"),
            )
            print(json.dumps(receipt, ensure_ascii=False, indent=2))
        elif args.command == "pending":
            print(json.dumps(pending_learner_turn(repo_root), ensure_ascii=False, indent=2))
        elif args.command == "advance":
            result = advance_learning_turn(repo_root, args.decision_id, _load_payload(args.payload))
            print(json.dumps(result, ensure_ascii=False, indent=2))
        elif args.command == "artifact":
            result = record_learning_artifact(repo_root, _load_payload(args.payload))
            print(json.dumps(result, ensure_ascii=False, indent=2))
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
