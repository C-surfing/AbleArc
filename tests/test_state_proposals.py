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
        self.assertFalse(pending[0]["stale"])
        self.assertNotIn("evidence_ids", pending[0])

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

    def test_policy_issue_requires_explicit_learner_override(self):
        evidence = self.evidence()
        first = self.proposal("unknown", "exposed", [evidence["id"]])
        state_proposals.decide_state_proposal(self.root, first["id"], "accepted", "Accept first observed state.")
        second = self.proposal("exposed", "stable", [evidence["id"]])

        pending = state_proposals.pending_state_proposals(self.root)
        self.assertEqual(pending[0]["id"], second["id"])
        self.assertTrue(pending[0]["policy_issues"])
        with self.assertRaisesRegex(runtime.RuntimeContractError, "transition policy rejected acceptance"):
            state_proposals.decide_state_proposal(
                self.root,
                second["id"],
                "accepted",
                "Accept without an override.",
            )

        decision = state_proposals.decide_state_proposal(
            self.root,
            second["id"],
            "accepted",
            "I explicitly understand and override the conservative transition policy.",
            override_policy=True,
        )
        self.assertTrue(decision["policy_overridden"])

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
