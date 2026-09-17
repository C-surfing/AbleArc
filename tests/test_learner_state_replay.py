import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools import learner_state_replay, project_lifecycle, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class LearnerStateReplayTests(unittest.TestCase):
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

    def tearDown(self):
        self.tmp.cleanup()

    def evidence(self, *, level="recognition", context="same", independence="same_form"):
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
        evidence = runtime.record_evidence(
            self.root,
            {
                "observation_id": observation["id"],
                "concept_ids": ["bayes-base-rate"],
                "level": level,
                "outcome": "supports",
                "result_summary": "Usable base-rate reasoning was observed.",
                "scaffolding": "none",
                "context": context,
                "delay": "immediate",
                "independence": independence,
                "supports": ["base-rate model"],
                "contradicts": [],
                "confidence": "high",
                "assessor": "test-suite",
            },
        )
        return decision, observation, evidence

    def transition(self, before, after, *, level="recognition", context="same", independence="same_form"):
        decision, observation, evidence = self.evidence(
            level=level,
            context=context,
            independence=independence,
        )
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
            f"Accept the {before} to {after} transition.",
        )
        turn = runtime.record_turn(
            self.root,
            {
                "decision_id": decision["id"],
                "observation_ids": [observation["id"]],
                "evidence_ids": [evidence["id"]],
                "state_proposal_ids": [proposal["id"]],
                "state_decision_ids": [state_decision["id"]],
                "artifact_refs": [],
                "outcome": "completed",
                "summary": f"Learner state moved from {before} to {after}.",
            },
        )
        return proposal, state_decision, turn

    def test_replays_only_accepted_state_changes_with_turn_context(self):
        first_proposal, first_decision, first_turn = self.transition("unknown", "exposed")
        second_proposal, second_decision, second_turn = self.transition(
            "exposed",
            "developing",
            level="explanation",
            context="varied",
            independence="new_form",
        )

        _, _, weak_evidence = self.evidence()
        rejected = runtime.record_state_proposal(
            self.root,
            {
                "concept_id": "bayes-base-rate",
                "concept_label": "Bayes base-rate reasoning",
                "before": "developing",
                "after": "stable",
                "evidence_ids": [weak_evidence["id"]],
                "rationale": "A deliberately rejected overclaim.",
                "proposed_by": "teach-agent:test",
            },
        )
        runtime.decide_state_proposal(
            self.root,
            rejected["id"],
            "rejected",
            "learner",
            "workspace-learner",
            "This does not yet establish stable performance.",
        )

        replay = learner_state_replay.learner_state_replay(self.root)

        self.assertEqual(replay["project_id"], "bayes")
        self.assertEqual(replay["runtime_revision"], 2)
        self.assertEqual(len(replay["events"]), 2)
        newest, oldest = replay["events"]
        self.assertEqual((newest["before"], newest["after"]), ("exposed", "developing"))
        self.assertEqual(newest["decision_id"], second_decision["id"])
        self.assertEqual(newest["turn"]["id"], second_turn["id"])
        self.assertEqual(newest["evidence_count"], 1)
        self.assertEqual((oldest["before"], oldest["after"]), ("unknown", "exposed"))
        self.assertEqual(oldest["proposal_id"], first_proposal["id"])
        self.assertEqual(oldest["turn"]["id"], first_turn["id"])
        self.assertNotIn(rejected["id"], {event["proposal_id"] for event in replay["events"]})

    def test_fails_closed_when_accepted_transition_chain_is_tampered(self):
        self.transition("unknown", "exposed")
        second_proposal, _, _ = self.transition(
            "exposed",
            "developing",
            level="explanation",
            context="varied",
            independence="new_form",
        )
        context = project_store.resolve_project_context(self.root)
        directory = runtime.RECEIPT_DIRS["state-proposal"]
        proposal_path = context.runtime_root / "receipts" / directory / f"{second_proposal['id']}.json"
        value = json.loads(proposal_path.read_text(encoding="utf-8"))
        value["before"] = "unknown"
        proposal_path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")

        with self.assertRaisesRegex(
            learner_state_replay.LearnerStateReplayError,
            "integrity failed|discontinuous",
        ):
            learner_state_replay.learner_state_replay(self.root)


if __name__ == "__main__":
    unittest.main()
