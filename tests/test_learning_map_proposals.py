import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools import learning_map, learning_map_proposals, project_lifecycle, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class LearningMapProposalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "templates").mkdir()
        for name in ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md"):
            shutil.copy2(REPO_ROOT / "templates" / name, self.root / "templates" / name)
        project_lifecycle.create_project(
            self.root,
            title="Bayes from first principles",
            goal="Explain and apply Bayes reasoning independently",
            project_id="bayes",
        )
        self.evidence_id = self._evidence()

    def tearDown(self):
        self.tmp.cleanup()

    def _evidence(self):
        decision = runtime.list_receipts(self.root, "decision")[-1]
        runtime.record_learner_response(
            self.root,
            decision["id"],
            "I compare prior populations before conditioning on a positive result.",
        )
        result = runtime.advance_learning_turn(
            self.root,
            decision["id"],
            {
                "assessment": {
                    "level": "explanation",
                    "outcome": "supports",
                    "failure_mode": "none",
                "artifact_form": "prose",
                    "result_summary": "The learner used the base-rate populations correctly.",
                    "scaffolding": "light",
                    "context": "same",
                    "delay": "immediate",
                    "independence": "same_form",
                    "supports": ["base-rate comparison"],
                    "contradicts": [],
                    "confidence": "medium",
                    "assessor": "test-suite",
                },
                "next_decision": {
                    "mode": "teach",
                    "target": "Bayes reasoning",
                    "concept_ids": ["bayes-reasoning"],
                    "frontier_hypothesis": "Conditional direction remains the nearest dependency.",
                    "uncertainty": "medium",
                    "move": "connect",
                    "rationale": "Connect prior populations to the posterior update.",
                    "learner_action": "Explain the update in a new context.",
                    "representation": {
                        "kind": "conversation",
                        "purpose": "Test structural explanation.",
                    },
                    "expected_evidence": "Correct conditional direction.",
                    "falsification_signal": "The conditional is reversed.",
                },
            },
        )
        return result["evidence"]["id"]

    def _map_payload(self, *, alternate=False):
        label = "Conditional direction" if alternate else "Conditional probability"
        return {
            "rationale": (
                "The evidence suggests conditional direction is the nearest prerequisite."
                if alternate
                else "The evidence exposes conditional probability as the nearest prerequisite."
            ),
            "evidence_ids": [self.evidence_id],
            "frontier": ["bayes-reasoning"],
            "nodes": [
                {
                    "id": "conditional-probability",
                    "label": label,
                    "kind": "concept",
                    "mission_relevance": "supporting",
                },
                {
                    "id": "bayes-reasoning",
                    "label": "Bayes reasoning",
                    "kind": "strategy",
                    "mission_relevance": "core",
                },
            ],
            "edges": [
                {
                    "id": "conditional-to-bayes",
                    "source": "conditional-probability",
                    "target": "bayes-reasoning",
                    "relation": "prerequisite",
                    "confidence": "high",
                }
            ],
        }

    def _proposal_payload(self, proposal_id="mp_bayes_route"):
        return {
            "id": proposal_id,
            "proposed_by": "teach-agent:test",
            **self._map_payload(),
        }

    def test_proposal_is_immutable_review_input_not_a_map_revision(self):
        proposal = learning_map_proposals.propose_learning_map(
            self.root, self._proposal_payload()
        )
        current = learning_map.load_learning_map(self.root)
        pending = learning_map_proposals.pending_learning_map_proposals(self.root)

        self.assertEqual(current["revision"], 0)
        self.assertEqual(current["nodes"], [])
        self.assertEqual(proposal["base_revision"], 0)
        self.assertEqual(proposal["delta"]["added_node_ids"], [
            "bayes-reasoning", "conditional-probability",
        ])
        self.assertEqual(len(pending), 1)
        self.assertFalse(pending[0]["stale"])
        self.assertIn("Conditional probability", pending[0]["changes"]["added_nodes"])
        context = project_store.resolve_project_context(self.root)
        self.assertTrue((context.learning_map_path.parent / "proposals" / "mp_bayes_route.json").is_file())

    def test_acceptance_writes_one_map_revision_without_mastery_side_effects(self):
        learning_map_proposals.propose_learning_map(self.root, self._proposal_payload())
        decision = learning_map_proposals.decide_learning_map_proposal(
            self.root,
            "mp_bayes_route",
            "accepted",
            "This dependency matches the evidence and the route I want to use.",
        )
        current = learning_map.load_learning_map(self.root)
        state = runtime.rebuild_state(self.root)

        self.assertEqual(decision["accepted_revision"], 1)
        self.assertEqual(current["revision"], 1)
        self.assertEqual(current["frontier"], ["bayes-reasoning"])
        self.assertEqual(state["concepts"], {})
        self.assertEqual(learning_map_proposals.pending_learning_map_proposals(self.root), [])

    def test_stale_proposal_cannot_overwrite_a_newer_topology_but_can_be_rejected(self):
        learning_map_proposals.propose_learning_map(self.root, self._proposal_payload())
        learning_map.update_learning_map(self.root, self._map_payload(alternate=True))

        pending = learning_map_proposals.pending_learning_map_proposals(self.root)
        self.assertTrue(pending[0]["stale"])
        with self.assertRaisesRegex(
            learning_map_proposals.LearningMapProposalError,
            "stale LearningMap proposal",
        ):
            learning_map_proposals.decide_learning_map_proposal(
                self.root,
                "mp_bayes_route",
                "accepted",
                "Apply the older route anyway.",
            )

        rejected = learning_map_proposals.decide_learning_map_proposal(
            self.root,
            "mp_bayes_route",
            "rejected",
            "The canonical route has already changed.",
        )
        self.assertEqual(rejected["decision"], "rejected")
        self.assertIsNone(rejected["accepted_revision"])
        self.assertEqual(learning_map.load_learning_map(self.root)["revision"], 1)

    def test_acceptance_recovers_if_map_write_completed_before_decision_receipt(self):
        payload = self._proposal_payload()
        learning_map_proposals.propose_learning_map(self.root, payload)
        learning_map.update_learning_map(self.root, self._map_payload())

        decision = learning_map_proposals.decide_learning_map_proposal(
            self.root,
            "mp_bayes_route",
            "accepted",
            "Recover the learner decision after the exact revision was already written.",
        )

        self.assertEqual(decision["accepted_revision"], 1)
        self.assertEqual(learning_map.load_learning_map(self.root)["revision"], 1)
        self.assertEqual(learning_map_proposals.pending_learning_map_proposals(self.root), [])

    def test_proposal_id_is_idempotent_only_for_identical_semantics(self):
        first = learning_map_proposals.propose_learning_map(
            self.root, self._proposal_payload()
        )
        second = learning_map_proposals.propose_learning_map(
            self.root, self._proposal_payload()
        )
        self.assertEqual(first, second)

        changed = self._proposal_payload()
        changed["rationale"] = "A different claimed reason for the same proposal id."
        with self.assertRaisesRegex(
            learning_map_proposals.LearningMapProposalError,
            "reused with different content",
        ):
            learning_map_proposals.propose_learning_map(self.root, changed)

    def test_read_only_project_blocks_proposal_and_decision(self):
        learning_map_proposals.propose_learning_map(self.root, self._proposal_payload())
        project_lifecycle.pause_project(self.root, "bayes")
        with self.assertRaisesRegex(
            learning_map_proposals.LearningMapProposalError,
            "paused Project",
        ):
            learning_map_proposals.decide_learning_map_proposal(
                self.root,
                "mp_bayes_route",
                "rejected",
                "Reject while paused.",
            )

        project_lifecycle.resume_project(self.root, "bayes")
        learning_map_proposals.decide_learning_map_proposal(
            self.root,
            "mp_bayes_route",
            "rejected",
            "Reject after resuming.",
        )
        project_lifecycle.pause_project(self.root, "bayes")
        with self.assertRaisesRegex(
            learning_map_proposals.LearningMapProposalError,
            "paused Project",
        ):
            learning_map_proposals.propose_learning_map(
                self.root,
                self._proposal_payload("mp_second_route"),
            )

    def test_decision_file_is_immutable_and_same_retry_is_idempotent(self):
        learning_map_proposals.propose_learning_map(self.root, self._proposal_payload())
        first = learning_map_proposals.decide_learning_map_proposal(
            self.root,
            "mp_bayes_route",
            "rejected",
            "The dependency needs more evidence.",
        )
        second = learning_map_proposals.decide_learning_map_proposal(
            self.root,
            "mp_bayes_route",
            "rejected",
            "The dependency needs more evidence.",
        )
        self.assertEqual(first, second)
        with self.assertRaisesRegex(
            learning_map_proposals.LearningMapProposalError,
            "already has a decision",
        ):
            learning_map_proposals.decide_learning_map_proposal(
                self.root,
                "mp_bayes_route",
                "accepted",
                "Changed my mind after the immutable rejection.",
            )


if __name__ == "__main__":
    unittest.main()
