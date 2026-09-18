import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools import learning, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class RuntimeV02ScopeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "templates").mkdir()
        for name in learning.TEMPLATE_FILES:
            shutil.copy2(REPO_ROOT / "templates" / name, self.root / "templates" / name)
        learning.init_learning(self.root)
        learning.start_learning_mission(
            self.root,
            "Explain and apply Bayes in unfamiliar decisions",
            "Use probabilistic reasoning independently.",
        )
        learning.migrate_legacy_workspace(self.root, project_id="bayes")
        self.context = project_store.resolve_project_context(self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def scope(self):
        return {
            "workspace_id": self.context.workspace_id,
            "project_id": self.context.project_id,
            "mission_id": self.context.mission_id,
        }

    def test_published_schema_requires_project_and_mission_scope(self):
        schema = json.loads(
            (REPO_ROOT / "schemas" / "runtime-v0.2.json").read_text(encoding="utf-8")
        )
        required = set(schema["$defs"]["base"]["required"])
        self.assertTrue({"workspace_id", "project_id", "mission_id"}.issubset(required))
        self.assertEqual(
            schema["$defs"]["base"]["properties"]["schema_version"],
            {"const": "0.2"},
        )
        self.assertEqual(
            tuple(schema["$defs"]["decision"]["allOf"][1]["properties"]["move"]["enum"]),
            runtime.MOVE_TYPES,
        )
        self.assertIn("frontierRevision", schema["$defs"])
        self.assertIn(
            {"$ref": "#/$defs/frontierRevision"},
            schema["oneOf"],
        )
        evidence = schema["$defs"]["evidence"]["allOf"][1]
        self.assertIn("failure_mode", evidence["required"])
        self.assertEqual(
            tuple(evidence["properties"]["failure_mode"]["enum"]),
            runtime.FAILURE_MODES,
        )
        self.assertEqual(len(evidence["allOf"]), 2)

    def assessment(self):
        return {
            "level": "explanation",
            "outcome": "supports",
            "failure_mode": "none",
            "result_summary": "The learner distinguished the prior from the likelihood.",
            "scaffolding": "light",
            "context": "same",
            "delay": "immediate",
            "independence": "same_form",
            "supports": ["base-rate reasoning"],
            "contradicts": [],
            "confidence": "medium",
            "assessor": "teach-agent:test",
        }

    def next_decision(self):
        return {
            "target": "Apply Bayes to a changed base rate",
            "frontier_hypothesis": "The explanation now needs a varied context.",
            "evidence_used": [],
            "uncertainty": "medium",
            "move": "apply",
            "rationale": "A varied case tests whether the explanation is usable.",
            "learner_action": "Solve the changed-base-rate case and explain the denominator.",
            "representation": {"kind": "conversation", "purpose": "Elicit independent application."},
            "expected_evidence": "The denominator includes both positive populations.",
            "falsification_signal": "The answer treats sensitivity as the posterior.",
        }

    def create_scoped_decision(self):
        legacy_decision = runtime.list_receipts(self.root, "decision")[-1]
        observation = runtime.record_learner_response(
            self.root,
            legacy_decision["id"],
            "The prior changes how many true cases enter the positive pool.",
        )
        result = runtime.advance_learning_turn(
            self.root,
            legacy_decision["id"],
            {"assessment": self.assessment(), "next_decision": self.next_decision()},
        )
        return observation, result

    def test_new_receipts_are_scoped_while_migrated_v01_receipts_stay_immutable(self):
        legacy_decision = runtime.list_receipts(self.root, "decision")[-1]
        self.assertEqual(legacy_decision["schema_version"], "0.1")
        self.assertNotIn("workspace_id", legacy_decision)

        observation, result = self.create_scoped_decision()
        proposal = runtime.record_state_proposal(
            self.root,
            {
                "concept_id": "mission-entry",
                "concept_label": "Mission entry",
                "before": "unknown",
                "after": "exposed",
                "evidence_ids": [result["evidence"]["id"]],
                "rationale": "One supported explanation justifies exposure only.",
                "proposed_by": "teach-agent:test",
            },
        )
        state_decision = runtime.decide_state_proposal(
            self.root,
            proposal["id"],
            "accepted",
            "runtime_policy",
            "conservative-v0.2",
            "The single-step promotion has supporting evidence.",
        )

        scoped = [
            observation,
            result["evidence"],
            result["turn"],
            result["next_decision"],
            proposal,
            state_decision,
        ]
        for receipt in scoped:
            self.assertEqual(receipt["schema_version"], "0.2")
            self.assertEqual(
                {field: receipt[field] for field in self.scope()},
                self.scope(),
            )
        self.assertEqual(runtime._current_state(self.root)["schema_version"], "0.1")
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_callers_cannot_override_runtime_assigned_scope(self):
        payload = {
            "workspace_id": "ws_wrong",
            **self.next_decision(),
            "mode": "teach",
            "concept_ids": ["bayes"],
        }
        with self.assertRaisesRegex(runtime.RuntimeContractError, "assigned by the active Project"):
            runtime.record_decision(self.root, payload)

    def test_scoped_evidence_records_failure_mode_without_changing_mastery(self):
        _, first = self.create_scoped_decision()
        decision = first["next_decision"]
        observation = runtime.record_learner_response(
            self.root,
            decision["id"],
            "I reused the earlier rule even though this case has a different structure.",
        )
        base = {
            **self.assessment(),
            "observation_id": observation["id"],
            "concept_ids": decision["concept_ids"],
            "result_summary": "A known rule was applied outside the conditions that made it valid.",
            "supports": [],
            "contradicts": ["context-sensitive transfer"],
        }

        with self.assertRaisesRegex(
            runtime.RuntimeContractError,
            "specific failure_mode",
        ):
            runtime.record_evidence(
                self.root,
                {**base, "outcome": "contradicts", "failure_mode": "none"},
            )

        with self.assertRaisesRegex(
            runtime.RuntimeContractError,
            "failure_mode=none",
        ):
            runtime.record_evidence(
                self.root,
                {**base, "outcome": "supports", "failure_mode": "slip"},
            )

        evidence = runtime.record_evidence(
            self.root,
            {**base, "outcome": "contradicts", "failure_mode": "overgeneralization"},
        )
        self.assertEqual(evidence["failure_mode"], "overgeneralization")
        self.assertEqual(runtime._current_state(self.root)["revision"], 0)
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_frontier_revision_preserves_refuted_hypothesis_without_changing_mastery(self):
        _, first = self.create_scoped_decision()
        superseded = first["next_decision"]
        runtime.record_learner_response(
            self.root,
            superseded["id"],
            "I cannot identify which populations the denominator represents.",
        )
        assessment = {
            **self.assessment(),
            "outcome": "contradicts",
            "failure_mode": "missing_prerequisite",
            "result_summary": "The learner lacks the prerequisite population representation.",
            "supports": [],
            "contradicts": ["usable population representation"],
        }
        next_decision = {
            **self.next_decision(),
            "frontier_hypothesis": (
                "The prerequisite population representation is missing; denominator reasoning "
                "is not yet the active frontier."
            ),
            "move": "establish_intuition",
        }
        revised = runtime.advance_learning_turn(
            self.root,
            superseded["id"],
            {"assessment": assessment, "next_decision": next_decision},
        )

        revision = runtime.record_frontier_revision(
            self.root,
            {
                "supersedes_decision_id": superseded["id"],
                "revised_by_decision_id": revised["next_decision"]["id"],
                "evidence_ids": [revised["evidence"]["id"]],
                "reason": "prerequisite_discovered",
                "rationale": "The failed explanation locates the frontier below denominator use.",
                "recorded_by": "teach-agent:test",
            },
        )

        self.assertEqual(revision["previous_hypothesis"], superseded["frontier_hypothesis"])
        self.assertEqual(
            revision["revised_hypothesis"],
            revised["next_decision"]["frontier_hypothesis"],
        )
        self.assertEqual(revision["reason"], "prerequisite_discovered")
        self.assertEqual(runtime._current_state(self.root)["revision"], 0)
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_frontier_revision_requires_evidence_used_by_revising_decision(self):
        _, first = self.create_scoped_decision()
        superseded = first["next_decision"]
        runtime.record_learner_response(self.root, superseded["id"], "I am not sure.")
        revised = runtime.advance_learning_turn(
            self.root,
            superseded["id"],
            {
                "assessment": {
                    **self.assessment(),
                    "outcome": "inconclusive",
                    "supports": [],
                },
                "next_decision": {
                    **self.next_decision(),
                    "frontier_hypothesis": "A prerequisite representation may be missing.",
                },
            },
        )

        with self.assertRaisesRegex(
            runtime.RuntimeContractError,
            "evidence must be used by the revising decision",
        ):
            runtime.record_frontier_revision(
                self.root,
                {
                    "supersedes_decision_id": superseded["id"],
                    "revised_by_decision_id": revised["next_decision"]["id"],
                    "evidence_ids": [first["evidence"]["id"]],
                    "reason": "hypothesis_refuted",
                    "rationale": "This should not be accepted without linked evidence.",
                    "recorded_by": "teach-agent:test",
                },
            )

    def test_tampered_project_scope_is_rejected_on_read(self):
        _, result = self.create_scoped_decision()
        decision = result["next_decision"]
        path = self.context.runtime_root / "receipts" / "decisions" / f"{decision['id']}.json"
        tampered = {**decision, "project_id": "another-project"}
        runtime._write_json(path, tampered)

        with self.assertRaisesRegex(runtime.RuntimeContractError, "does not match its Project storage"):
            runtime.load_receipt(self.root, "decision", decision["id"])
        self.assertTrue(
            any("does not match its Project storage" in problem for problem in runtime.verify_runtime(self.root))
        )

    def test_new_chain_cannot_reference_a_different_mission(self):
        _, result = self.create_scoped_decision()
        decision = result["next_decision"]
        second_id = "maintenance-check"
        second_root = self.context.project_root / "missions" / second_id
        second_root.mkdir(parents=True)
        (second_root / "MISSION.md").write_text(
            "# Learning Mission\n\n- Goal: Confirm retained Bayes transfer.\n",
            encoding="utf-8",
        )
        (second_root / "mission.json").write_text(
            json.dumps(
                {
                    "schema_version": "0.2",
                    "id": second_id,
                    "project_id": self.context.project_id,
                    "status": "active",
                    "goal": "Confirm retained Bayes transfer",
                    "why": "Maintenance retrieval",
                    "source": "agent-assisted",
                    "criteria": [],
                    "created_at": "2026-09-16T00:00:00Z",
                    "updated_at": "2026-09-16T00:00:00Z",
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        project = json.loads(self.context.project_manifest_path.read_text(encoding="utf-8"))
        project["active_mission_id"] = second_id
        project["updated_at"] = "2026-09-16T00:00:00Z"
        self.context.project_manifest_path.write_text(
            json.dumps(project, indent=2) + "\n",
            encoding="utf-8",
        )

        self.assertIn(decision, runtime.list_receipts(self.root, "decision"))
        later_payload = {
            **self.next_decision(),
            "mode": "study",
            "concept_ids": ["mission-entry"],
            "evidence_used": [result["evidence"]["id"]],
        }
        later_decision = runtime.record_decision(self.root, later_payload)
        self.assertEqual(later_decision["mission_id"], second_id)
        with self.assertRaisesRegex(runtime.RuntimeContractError, "one Mission scope"):
            runtime.record_learner_response(
                self.root,
                decision["id"],
                "This response belongs to the newly active Mission.",
            )


if __name__ == "__main__":
    unittest.main()
