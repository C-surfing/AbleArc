import io
import json
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from tools import completion_gate, learning, project_lifecycle, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class CompletionGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "templates").mkdir()
        for name in ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md"):
            shutil.copy2(REPO_ROOT / "templates" / name, self.root / "templates" / name)
        project_lifecycle.create_project(
            self.root,
            title="Bayes from first principles",
            goal="Explain and apply Bayes independently",
            project_id="bayes",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def advance(self, *, level, scaffolding, context, delay, independence, target):
        decision = runtime.list_receipts(self.root, "decision")[-1]
        runtime.record_learner_response(
            self.root,
            decision["id"],
            f"Independent learner response for {target}.",
        )
        result = runtime.advance_learning_turn(
            self.root,
            decision["id"],
            {
                "assessment": {
                    "level": level,
                    "outcome": "supports",
                    "result_summary": f"The learner demonstrated {target}.",
                    "scaffolding": scaffolding,
                    "context": context,
                    "delay": delay,
                    "independence": independence,
                    "supports": [target],
                    "contradicts": [],
                    "confidence": "high",
                    "assessor": "test-suite",
                },
                "next_decision": {
                    "mode": "teach",
                    "target": target,
                    "concept_ids": ["bayes-reasoning"],
                    "frontier_hypothesis": "The next action tests a distinct completion capability.",
                    "uncertainty": "medium",
                    "move": "transfer",
                    "rationale": "Completion requires more than one form of evidence.",
                    "learner_action": f"Attempt {target}.",
                    "representation": {"kind": "conversation", "purpose": "Verify completion evidence."},
                    "expected_evidence": f"Independent {target}.",
                    "falsification_signal": "The learner needs mechanism prompts.",
                },
            },
        )
        return result["evidence"]["id"]

    def criterion(self, criterion_id, kind, evidence_ids):
        defaults = {
            "feynman": ("explanation", "light", "same", "immediate", "independent"),
            "performance": ("application", "light", "same", "immediate", "independent"),
            "application": ("application", "light", "varied", "immediate", "independent"),
            "transfer": ("transfer", "light", "novel", "immediate", "independent"),
            "retrieval": ("recall", "light", "same", "delayed", "independent"),
        }
        level, scaffolding, context, delay, independence = defaults[kind]
        return {
            "id": criterion_id,
            "capability": f"Demonstrate {kind} without borrowed support",
            "kind": kind,
            "required": True,
            "minimum_level": level,
            "max_scaffolding": scaffolding,
            "minimum_context": context,
            "minimum_delay": delay,
            "minimum_independence": independence,
            "minimum_evidence": 1,
            "evidence_ids": evidence_ids,
        }

    def evidence_pair(self):
        feynman = self.advance(
            level="explanation",
            scaffolding="light",
            context="same",
            delay="immediate",
            independence="independent",
            target="Feynman reconstruction",
        )
        performance = self.advance(
            level="application",
            scaffolding="none",
            context="varied",
            delay="immediate",
            independence="independent",
            target="independent application",
        )
        return feynman, performance

    def test_unconfigured_mission_reports_configuration_required(self):
        status = completion_gate.completion_status(self.root)

        self.assertEqual(status["status"], "configuration_required")
        self.assertFalse(status["ready"])

    def test_policy_rejects_weak_feynman_and_missing_performance(self):
        weak = self.criterion("explain", "feynman", [])
        weak["minimum_independence"] = "same_form"
        with self.assertRaisesRegex(completion_gate.CompletionGateError, "Feynman criteria"):
            completion_gate.set_completion_criteria(self.root, {"criteria": [
                weak,
                self.criterion("retrieve", "retrieval", []),
            ]})

        with self.assertRaisesRegex(completion_gate.CompletionGateError, "performance criterion"):
            completion_gate.set_completion_criteria(self.root, {"criteria": [
                self.criterion("explain", "feynman", []),
                self.criterion("retrieve", "retrieval", []),
            ]})

    def test_gate_requires_distinct_feynman_and_performance_evidence(self):
        _, performance = self.evidence_pair()
        status = completion_gate.set_completion_criteria(self.root, {"criteria": [
            self.criterion("explain", "feynman", [performance]),
            self.criterion("perform", "performance", [performance]),
        ]})

        self.assertEqual(status["passed_required_count"], 2)
        self.assertFalse(status["has_distinct_feynman_and_performance_evidence"])
        self.assertFalse(status["ready"])
        with self.assertRaisesRegex(completion_gate.CompletionGateError, "not satisfied"):
            completion_gate.complete_project(self.root)

    def test_gate_uses_thresholds_not_just_linked_evidence(self):
        feynman, _ = self.evidence_pair()
        status = completion_gate.set_completion_criteria(self.root, {"criteria": [
            self.criterion("explain", "feynman", [feynman]),
            self.criterion("transfer", "transfer", [feynman]),
        ]})

        transfer = next(item for item in status["criteria"] if item["id"] == "transfer")
        self.assertFalse(transfer["passed"])
        self.assertEqual(transfer["qualifying_evidence_ids"], [])
        self.assertFalse(status["ready"])

    def test_ready_gate_completes_mission_and_archives_without_deletion(self):
        feynman, performance = self.evidence_pair()
        optional_retrieval = self.criterion("retain", "retrieval", [])
        optional_retrieval["required"] = False
        status = completion_gate.set_completion_criteria(self.root, {"criteria": [
            self.criterion("explain", "feynman", [feynman]),
            self.criterion("perform", "performance", [performance]),
            optional_retrieval,
        ]})
        self.assertTrue(status["ready"])
        context = project_store.resolve_project_context(self.root)
        project_root = context.project_root

        result = completion_gate.complete_project(self.root)

        self.assertEqual(result["status"], "completed")
        updated = project_store.resolve_project_context(self.root)
        self.assertEqual(updated.mission_status, "completed")
        self.assertEqual(updated.project_status, "archived")
        self.assertEqual(updated.maintenance_status, "scheduled")
        self.assertTrue(project_root.is_dir())
        completion_path = updated.mission_root / "completion.json"
        completion = json.loads(completion_path.read_text(encoding="utf-8"))
        self.assertEqual(completion["kind"], "mission-completion")
        self.assertEqual(completion["evidence_ids"], sorted([feynman, performance]))
        completed_status = completion_gate.complete_project(self.root)
        self.assertEqual(completed_status["completion_id"], completion["id"])
        retrieval = next(item for item in completed_status["criteria"] if item["id"] == "retain")
        self.assertFalse(retrieval["passed"])
        with self.assertRaisesRegex(runtime.RuntimeContractError, "outside an active maintenance"):
            runtime.record_decision(self.root, {
                "mode": "teach",
                "target": "extra work",
                "concept_ids": ["bayes-reasoning"],
                "frontier_hypothesis": "No new main-line work after completion.",
                "evidence_used": [],
                "uncertainty": "low",
                "move": "probe",
                "rationale": "Should be blocked.",
                "learner_action": "Respond.",
                "representation": {"kind": "conversation", "purpose": "Test lifecycle."},
                "expected_evidence": "None.",
                "falsification_signal": "Any write succeeds.",
            })

    def test_pending_response_blocks_completion(self):
        feynman, performance = self.evidence_pair()
        completion_gate.set_completion_criteria(self.root, {"criteria": [
            self.criterion("explain", "feynman", [feynman]),
            self.criterion("perform", "performance", [performance]),
        ]})
        decision = runtime.list_receipts(self.root, "decision")[-1]
        runtime.record_learner_response(self.root, decision["id"], "One more unresolved response.")

        with self.assertRaisesRegex(completion_gate.CompletionGateError, "pending learner response"):
            completion_gate.complete_project(self.root)

    def test_expected_project_prevents_stale_workspace_completion(self):
        feynman, performance = self.evidence_pair()
        completion_gate.set_completion_criteria(self.root, {"criteria": [
            self.criterion("explain", "feynman", [feynman]),
            self.criterion("perform", "performance", [performance]),
        ]})

        with self.assertRaisesRegex(completion_gate.CompletionGateError, "selected Project changed"):
            completion_gate.complete_project(self.root, "different-project")

        context = project_store.resolve_project_context(self.root)
        self.assertEqual(context.project_status, "active")
        self.assertEqual(context.mission_status, "active")
        self.assertFalse((context.mission_root / "completion.json").exists())

    def test_published_completion_schema_requires_feynman_provenance(self):
        schema = json.loads(
            (REPO_ROOT / "schemas" / "mission-completion-v0.1.json").read_text(encoding="utf-8")
        )
        self.assertIn("feynman_criterion_ids", schema["required"])
        self.assertIn("independent_performance_criterion_ids", schema["required"])
        self.assertEqual(
            schema["$defs"]["criterion"]["properties"]["kind"]["enum"],
            ["feynman", "performance", "application", "transfer", "retrieval"],
        )
        self.assertNotIn(
            "minItems",
            schema["$defs"]["criterion"]["properties"]["evidence_ids"],
        )

    def test_cli_configures_and_reports_completion_status(self):
        feynman, performance = self.evidence_pair()
        payload = {"criteria": [
            self.criterion("explain", "feynman", [feynman]),
            self.criterion("perform", "performance", [performance]),
        ]}
        payload_path = self.root / "criteria.json"
        payload_path.write_text(json.dumps(payload), encoding="utf-8")
        output = io.StringIO()

        with redirect_stdout(output):
            code = learning.main(["criteria-set", str(payload_path)], self.root)

        self.assertEqual(code, 0)
        self.assertTrue(json.loads(output.getvalue())["ready"])
        output = io.StringIO()
        with redirect_stdout(output):
            code = learning.main(["completion-status"], self.root)
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(output.getvalue())["status"], "ready")

    def test_cross_project_evidence_cannot_satisfy_completion(self):
        feynman, performance = self.evidence_pair()
        project_lifecycle.create_project(
            self.root,
            title="Second Project",
            goal="Build an unrelated capability",
            project_id="second",
        )

        with self.assertRaisesRegex(completion_gate.CompletionGateError, "cannot use Evidence"):
            completion_gate.set_completion_criteria(self.root, {"criteria": [
                self.criterion("explain", "feynman", [feynman]),
                self.criterion("perform", "performance", [performance]),
            ]})


if __name__ == "__main__":
    unittest.main()
