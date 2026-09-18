import shutil
import tempfile
import unittest
from pathlib import Path

from tools import project_lifecycle, review_observations, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class ReviewObservationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "templates").mkdir()
        for name in ("MISSION.md", "LEARNER.md", "ROADMAP.md", "STATE.md"):
            shutil.copy2(REPO_ROOT / "templates" / name, self.root / "templates" / name)
        project_lifecycle.create_project(
            self.root,
            title="Bayes retention arc",
            goal="Retain and transfer Bayes reasoning across sessions",
            project_id="bayes",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def evidence(self, *, level, delay, outcome="supports", context="same", independence="same_form"):
        decision = runtime.record_decision(
            self.root,
            {
                "mode": "study" if delay == "delayed" else "teach",
                "target": "Bayes base-rate reasoning",
                "concept_ids": ["bayes-base-rate"],
                "frontier_hypothesis": "Base-rate reasoning should survive retrieval.",
                "evidence_used": [],
                "uncertainty": "medium",
                "move": "retrieve" if delay == "delayed" else "probe",
                "rationale": "Observe independent reconstruction.",
                "learner_action": "Explain how prevalence changes a posterior without seeing the prior example.",
                "representation": {"kind": "conversation", "purpose": "Elicit the learner model."},
                "expected_evidence": "Reference-class reasoning without answer cues.",
                "falsification_signal": "Sensitivity is treated as the posterior.",
            },
        )
        observation = runtime.record_observation(
            self.root,
            {
                "decision_id": decision["id"],
                "concept_ids": ["bayes-base-rate"],
                "learner_action": decision["learner_action"],
                "observed_result": "The learner compared true and false positive reference classes.",
                "source": "learner",
            },
        )
        evidence = runtime.record_evidence(
            self.root,
            {
                "observation_id": observation["id"],
                "concept_ids": ["bayes-base-rate"],
                "level": level,
                "outcome": outcome,
                "failure_mode": "none" if outcome == "supports" else "wrong_causal_model",
                "result_summary": "Reference-class reasoning was reconstructed independently.",
                "scaffolding": "none",
                "context": context,
                "delay": delay,
                "independence": independence,
                "supports": ["base-rate model"] if outcome == "supports" else [],
                "contradicts": ["base-rate model"] if outcome == "contradicts" else [],
                "confidence": "high",
                "assessor": "test-suite",
            },
        )
        return decision, observation, evidence

    def accept_transition(self, before, after, evidence, *, turn_parts=None):
        proposal = runtime.record_state_proposal(
            self.root,
            {
                "concept_id": "bayes-base-rate",
                "concept_label": "Bayes base-rate reasoning",
                "before": before,
                "after": after,
                "evidence_ids": [evidence["id"]],
                "rationale": f"Evidence supports {before} to {after}.",
                "proposed_by": "teach-agent:test",
            },
        )
        state_decision = runtime.decide_state_proposal(
            self.root,
            proposal["id"],
            "accepted",
            "learner",
            "workspace-learner",
            f"Accept {before} to {after} for this evaluation fixture.",
        )
        if turn_parts:
            decision, observation = turn_parts
            runtime.record_turn(
                self.root,
                {
                    "decision_id": decision["id"],
                    "observation_ids": [observation["id"]],
                    "evidence_ids": [evidence["id"]],
                    "state_proposal_ids": [proposal["id"]],
                    "state_decision_ids": [state_decision["id"]],
                    "artifact_refs": [],
                    "outcome": "completed",
                    "summary": f"Delayed retrieval supported {before} to {after}.",
                },
            )
        return proposal, state_decision

    def test_exports_delayed_evidence_with_state_at_attempt_and_later_transition(self):
        first_decision, first_observation, immediate = self.evidence(
            level="recognition",
            delay="immediate",
        )
        self.accept_transition("unknown", "exposed", immediate, turn_parts=(first_decision, first_observation))

        delayed_decision, delayed_observation, delayed = self.evidence(
            level="explanation",
            delay="delayed",
            context="varied",
            independence="new_form",
        )
        proposal, state_decision = self.accept_transition(
            "exposed",
            "developing",
            delayed,
            turn_parts=(delayed_decision, delayed_observation),
        )

        report = review_observations.review_observations(self.root)

        self.assertEqual(report["project_id"], "bayes")
        self.assertEqual(report["runtime_revision"], 2)
        self.assertEqual(report["observation_count"], 1)
        self.assertEqual(report["interpretation"], "descriptive_only_no_review_priority")
        item = report["observations"][0]
        self.assertEqual(item["evidence_id"], delayed["id"])
        self.assertEqual(item["concept_id"], "bayes-base-rate")
        self.assertEqual(item["state_before"], "exposed")
        self.assertEqual(item["level"], "explanation")
        self.assertEqual(item["outcome"], "supports")
        self.assertEqual(item["context"], "varied")
        self.assertEqual(item["independence"], "new_form")
        self.assertEqual(item["turn"]["outcome"], "completed")
        self.assertEqual(len(item["accepted_transitions_using_evidence"]), 1)
        transition = item["accepted_transitions_using_evidence"][0]
        self.assertEqual((transition["before"], transition["after"]), ("exposed", "developing"))
        self.assertEqual(transition["decision_id"], state_decision["id"])
        self.assertNotEqual(transition["decision_id"], proposal["id"])

        serialized = str(report).lower()
        for prohibited in ("priority", "score", "due_at", "next_review"):
            if prohibited == "priority":
                # The explicit interpretation marker documents that no priority is produced.
                self.assertNotIn("'priority':", serialized)
            else:
                self.assertNotIn(prohibited, serialized)

    def test_immediate_evidence_does_not_become_review_observation(self):
        _, _, immediate = self.evidence(level="application", delay="immediate")
        report = review_observations.review_observations(self.root)
        self.assertEqual(report["observation_count"], 0)
        self.assertEqual(report["observations"], [])
        self.assertEqual(report["runtime_revision"], 0)
        self.assertEqual(immediate["delay"], "immediate")


if __name__ == "__main__":
    unittest.main()
