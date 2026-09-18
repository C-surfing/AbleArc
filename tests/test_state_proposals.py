import tempfile
import unittest
from pathlib import Path

from tools import runtime, state_proposals


class StateProposalReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        runtime.init_runtime(self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def evidence(self, *, outcome="supports"):
        decision = runtime.record_decision(
            self.root,
            {
                "mode": "teach",
                "target": "Bayes base-rate reasoning",
                "concept_ids": ["bayes-base-rate"],
                "frontier_hypothesis": "The learner may ignore the base rate.",
                "evidence_used": [],
                "uncertainty": "medium",
                "move": "probe",
                "rationale": "Test the current model.",
                "learner_action": "Explain how prevalence changes the posterior.",
                "representation": {"kind": "conversation", "purpose": "Elicit reasoning."},
                "expected_evidence": "A reference-class explanation.",
                "falsification_signal": "Sensitivity is treated as the posterior.",
            },
        )
        observation = runtime.record_observation(
            self.root,
            {
                "decision_id": decision["id"],
                "concept_ids": ["bayes-base-rate"],
                "learner_action": decision["learner_action"],
                "observed_result": "I compared true and false positive groups.",
                "source": "learner",
            },
        )
        return runtime.record_evidence(
            self.root,
            {
                "observation_id": observation["id"],
                "concept_ids": ["bayes-base-rate"],
                "level": "application",
                "outcome": outcome,
                "result_summary": "Independent base-rate reasoning was observed.",
                "scaffolding": "none",
                "context": "varied",
                "delay": "immediate",
                "independence": "independent",
                "supports": ["base-rate model"] if outcome == "supports" else [],
                "contradicts": ["base-rate model"] if outcome == "contradicts" else [],
                "confidence": "high",
                "assessor": "test-suite",
            },
        )

    def proposal(self, before, after, evidence_ids):
        return runtime.record_state_proposal(
            self.root,
            {
                "concept_id": "bayes-base-rate",
                "concept_label": "Bayes base-rate reasoning",
                "before": before,
                "after": after,
                "evidence_ids": evidence_ids,
                "rationale": f"Move from {before} to {after}.",
                "proposed_by": "teach-agent:test",
            },
        )

    def test_lists_pending_proposal_without_exposing_evidence_ids(self):
        evidence = self.evidence()
        proposal = self.proposal("unknown", "exposed", [evidence["id"]])

        pending = state_proposals.pending_state_proposals(self.root)
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["id"], proposal["id"])
        self.assertEqual(pending[0]["current_state"], "unknown")
        self.assertEqual(pending[0]["evidence_count"], 1)
        self.assertEqual(pending[0]["policy_issues"], [])
        self.assertEqual(pending[0]["risk"], "low")
        self.assertTrue(pending[0]["auto_accept_eligible"])
        self.assertFalse(pending[0]["stale"])
        self.assertNotIn("evidence_ids", pending[0])

    def test_runtime_policy_reconcile_accepts_only_low_risk_first_exposure(self):
        evidence = self.evidence()
        first = self.proposal("unknown", "exposed", [evidence["id"]])

        decisions = state_proposals.reconcile_low_risk_state_proposals(self.root)
        self.assertEqual(len(decisions), 1)
        self.assertEqual(decisions[0]["proposal_id"], first["id"])
        self.assertEqual(decisions[0]["decision"], "accepted")
        self.assertEqual(
            decisions[0]["authority"],
            {"type": "runtime_policy", "id": "low-risk-v0.1"},
        )
        self.assertFalse(decisions[0]["policy_overridden"])
        self.assertEqual(
            runtime.rebuild_state(self.root)["concepts"]["bayes-base-rate"]["state"],
            "exposed",
        )
        self.assertEqual(state_proposals.pending_state_proposals(self.root), [])
        self.assertEqual(runtime.verify_runtime(self.root), [])

        second = self.proposal("exposed", "developing", [evidence["id"]])
        pending = state_proposals.pending_state_proposals(self.root)
        self.assertEqual(pending[0]["id"], second["id"])
        self.assertEqual(pending[0]["risk"], "medium")
        self.assertFalse(pending[0]["auto_accept_eligible"])
        self.assertEqual(state_proposals.reconcile_low_risk_state_proposals(self.root), [])
        self.assertEqual(state_proposals.pending_state_proposals(self.root)[0]["id"], second["id"])

    def test_high_risk_transitions_never_become_auto_accept_eligible(self):
        evidence = self.evidence()
        first = self.proposal("unknown", "exposed", [evidence["id"]])
        state_proposals.reconcile_low_risk_state_proposals(self.root)
        second = self.proposal("exposed", "stable", [evidence["id"]])

        pending = state_proposals.pending_state_proposals(self.root)
        self.assertEqual(pending[0]["id"], second["id"])
        self.assertEqual(pending[0]["risk"], "high")
        self.assertFalse(pending[0]["auto_accept_eligible"])
        self.assertTrue(pending[0]["policy_issues"])
        self.assertEqual(state_proposals.reconcile_low_risk_state_proposals(self.root), [])

    def test_learner_acceptance_projects_state_and_clears_pending(self):
        evidence = self.evidence()
        proposal = self.proposal("unknown", "exposed", [evidence["id"]])

        decision = state_proposals.decide_state_proposal(
            self.root,
            proposal["id"],
            "accepted",
            "The evidence and proposed state match my observed performance.",
        )
        self.assertEqual(decision["authority"], {"type": "learner", "id": "workspace-learner"})
        self.assertEqual(runtime.rebuild_state(self.root)["concepts"]["bayes-base-rate"]["state"], "exposed")
        self.assertEqual(state_proposals.pending_state_proposals(self.root), [])

    def test_policy_rejection_is_auditable_and_override_requires_a_new_proposal(self):
        evidence = self.evidence()
        first = self.proposal("unknown", "exposed", [evidence["id"]])
        state_proposals.decide_state_proposal(
            self.root,
            first["id"],
            "accepted",
            "Accept first observed state.",
        )
        second = self.proposal("exposed", "stable", [evidence["id"]])

        pending = state_proposals.pending_state_proposals(self.root)
        self.assertEqual(pending[0]["id"], second["id"])
        self.assertTrue(pending[0]["policy_issues"])
        with self.assertRaisesRegex(
            runtime.RuntimeContractError,
            "transition policy rejected acceptance; rejection recorded as",
        ):
            state_proposals.decide_state_proposal(
                self.root,
                second["id"],
                "accepted",
                "Accept without an override.",
            )

        rejected = [
            item
            for item in runtime.list_receipts(self.root, "state-decision")
            if item["proposal_id"] == second["id"]
        ]
        self.assertEqual(len(rejected), 1)
        self.assertEqual(rejected[0]["decision"], "rejected")
        self.assertTrue(rejected[0]["policy_issues"])
        self.assertFalse(rejected[0]["policy_overridden"])
        self.assertNotIn("projection_revision", rejected[0])
        self.assertEqual(state_proposals.pending_state_proposals(self.root), [])
        self.assertEqual(
            runtime.rebuild_state(self.root)["concepts"]["bayes-base-rate"]["state"],
            "exposed",
        )
        self.assertEqual(runtime.verify_runtime(self.root), [])

        retry = self.proposal("exposed", "stable", [evidence["id"]])
        decision = state_proposals.decide_state_proposal(
            self.root,
            retry["id"],
            "accepted",
            "I explicitly understand and override the conservative transition policy.",
            override_policy=True,
        )
        self.assertTrue(decision["policy_overridden"])
        self.assertEqual(decision["decision"], "accepted")

    def test_rejection_does_not_change_state(self):
        evidence = self.evidence()
        proposal = self.proposal("unknown", "exposed", [evidence["id"]])
        state_proposals.decide_state_proposal(
            self.root,
            proposal["id"],
            "rejected",
            "The proposal overstates what the evidence demonstrates.",
        )
        self.assertEqual(runtime.rebuild_state(self.root)["revision"], 0)
        self.assertEqual(state_proposals.pending_state_proposals(self.root), [])


if __name__ == "__main__":
    unittest.main()
