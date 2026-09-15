import importlib.util
import tempfile
import unittest
from pathlib import Path


def load_runtime():
    path = Path(__file__).resolve().parents[1] / "tools" / "runtime.py"
    spec = importlib.util.spec_from_file_location("learning_runtime", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


runtime = load_runtime()


class LearningRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        runtime.init_runtime(self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def decision(self):
        return runtime.record_decision(
            self.root,
            {
                "mode": "teach",
                "target": "Bayes base-rate reasoning",
                "frontier_hypothesis": "The learner can use frequencies but may ignore priors in symbols.",
                "evidence_used": [],
                "uncertainty": "medium",
                "move": "contrast",
                "rationale": "A representation switch can discriminate notation trouble from conceptual trouble.",
                "learner_action": "Predict which posterior changes when the base rate changes.",
                "representation": {
                    "kind": "frequency_tree",
                    "purpose": "Make the denominator and competing populations visible.",
                },
                "expected_evidence": "The learner changes the posterior and explains the role of the prior.",
                "falsification_signal": "The learner still treats sensitivity as the posterior.",
            },
        )

    def evidence(
        self,
        *,
        level="application",
        outcome="supports",
        scaffolding="none",
        context="varied",
        delay="immediate",
        independence="independent",
        result="Correct independent application",
    ):
        decision = self.decision()
        observation = runtime.record_observation(
            self.root,
            {
                "decision_id": decision["id"],
                "concept_ids": ["bayes-base-rate"],
                "learner_action": "Calculated and explained a posterior.",
                "observed_result": result,
                "source": "learner",
            },
        )
        return runtime.record_evidence(
            self.root,
            {
                "observation_id": observation["id"],
                "concept_ids": ["bayes-base-rate"],
                "level": level,
                "outcome": outcome,
                "result_summary": result,
                "scaffolding": scaffolding,
                "context": context,
                "delay": delay,
                "independence": independence,
                "supports": ["usable base-rate model"] if outcome == "supports" else [],
                "contradicts": ["usable base-rate model"] if outcome == "contradicts" else [],
                "confidence": "high",
                "assessor": "teach-agent:test",
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
                "rationale": f"Evidence supports {before} to {after}.",
                "proposed_by": "teach-agent:test",
            },
        )

    def accept(self, proposal, **kwargs):
        return runtime.decide_state_proposal(
            self.root,
            proposal["id"],
            "accepted",
            kwargs.get("authority_type", "runtime_policy"),
            kwargs.get("authority_id", "conservative-v0.1"),
            kwargs.get("reason", "Policy checks passed."),
            override_policy=kwargs.get("override_policy", False),
        )

    def promote_to_developing(self):
        first = self.evidence(level="recognition", context="same", independence="same_form")
        self.accept(self.proposal("unknown", "exposed", [first["id"]]))
        second = self.evidence(level="explanation", context="varied", independence="new_form")
        self.accept(self.proposal("exposed", "developing", [second["id"]]))
        return first, second

    def test_init_is_idempotent_and_does_not_replace_state(self):
        state_path = self.root / ".learning" / "runtime" / "state.json"
        original = state_path.read_text(encoding="utf-8")
        self.assertEqual(runtime.init_runtime(self.root), [])
        self.assertEqual(state_path.read_text(encoding="utf-8"), original)

    def test_observation_and_evidence_are_distinct_immutable_receipts(self):
        evidence = self.evidence()
        observation = runtime.load_receipt(self.root, "observation", evidence["observation_id"])

        self.assertEqual(observation["kind"], "observation")
        self.assertEqual(evidence["kind"], "evidence")
        self.assertNotIn("level", observation)
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_evidence(self.root, evidence)

    def test_single_immediate_answer_cannot_promote_developing_to_stable(self):
        self.promote_to_developing()
        immediate = self.evidence(
            level="application", context="same", delay="immediate", independence="same_form"
        )
        proposal = self.proposal("developing", "stable", [immediate["id"]])

        issues = runtime.transition_policy_issues(self.root, proposal)
        self.assertTrue(any("at least two" in issue for issue in issues))
        with self.assertRaises(runtime.RuntimeContractError):
            self.accept(proposal)

    def test_two_independent_signals_can_be_explicitly_accepted_as_stable(self):
        self.promote_to_developing()
        immediate = self.evidence(level="application", context="varied", independence="new_form")
        delayed = self.evidence(level="recall", context="same", delay="delayed", independence="independent")
        proposal = self.proposal("developing", "stable", [immediate["id"], delayed["id"]])

        decision = self.accept(proposal)
        state = runtime._current_state(self.root)

        self.assertEqual(decision["decision"], "accepted")
        self.assertEqual(state["revision"], 3)
        self.assertEqual(state["concepts"]["bayes-base-rate"]["state"], "stable")

    def test_transferable_requires_novel_lightly_scaffolded_transfer(self):
        self.promote_to_developing()
        e1 = self.evidence(level="application", context="varied", independence="new_form")
        e2 = self.evidence(level="recall", context="same", delay="delayed", independence="independent")
        self.accept(self.proposal("developing", "stable", [e1["id"], e2["id"]]))
        ordinary = self.evidence(level="application", context="novel", independence="independent")
        blocked = self.proposal("stable", "transferable", [ordinary["id"]])
        self.assertTrue(runtime.transition_policy_issues(self.root, blocked))

        transfer = self.evidence(level="transfer", context="novel", independence="independent")
        accepted = self.accept(self.proposal("stable", "transferable", [transfer["id"]]))
        self.assertEqual(accepted["decision"], "accepted")

    def test_agent_cannot_be_state_authority(self):
        evidence = self.evidence()
        proposal = self.proposal("unknown", "exposed", [evidence["id"]])
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.decide_state_proposal(
                self.root,
                proposal["id"],
                "accepted",
                "agent",
                "teach-agent:test",
                "Agent accepted its own inference.",
            )

    def test_policy_override_is_visible_and_requires_human_or_learner(self):
        self.promote_to_developing()
        evidence = self.evidence(context="same", independence="same_form")
        proposal = self.proposal("developing", "stable", [evidence["id"]])
        decision = self.accept(
            proposal,
            authority_type="human_reviewer",
            authority_id="reviewer:test",
            reason="External assessment justifies an exception.",
            override_policy=True,
        )
        self.assertTrue(decision["policy_overridden"])
        self.assertGreater(len(decision["policy_issues"]), 0)

    def test_stale_proposal_cannot_overwrite_newer_state(self):
        first = self.evidence(level="recognition")
        proposal_a = self.proposal("unknown", "exposed", [first["id"]])
        second = self.evidence(level="recognition")
        proposal_b = self.proposal("unknown", "exposed", [second["id"]])
        self.accept(proposal_a)

        with self.assertRaises(runtime.RuntimeContractError):
            self.accept(proposal_b)

    def test_turn_receipt_closes_the_chain(self):
        evidence = self.evidence()
        observation = runtime.load_receipt(self.root, "observation", evidence["observation_id"])
        decision = runtime.load_receipt(self.root, "decision", observation["decision_id"])
        proposal = self.proposal("unknown", "exposed", [evidence["id"]])
        state_decision = self.accept(proposal)
        turn = runtime.record_turn(
            self.root,
            {
                "decision_id": decision["id"],
                "observation_ids": [observation["id"]],
                "evidence_ids": [evidence["id"]],
                "state_proposal_ids": [proposal["id"]],
                "state_decision_ids": [state_decision["id"]],
                "artifact_refs": ["artifacts/bayes-frequency-tree.json"],
                "outcome": "completed",
                "summary": "Representation switch produced evidence and an accepted exposed state.",
            },
        )

        self.assertEqual(turn["kind"], "turn")
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_turn_rejects_evidence_from_another_decision(self):
        evidence_a = self.evidence()
        evidence_b = self.evidence()
        observation_a = runtime.load_receipt(self.root, "observation", evidence_a["observation_id"])
        observation_b = runtime.load_receipt(self.root, "observation", evidence_b["observation_id"])
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_turn(
                self.root,
                {
                    "decision_id": observation_a["decision_id"],
                    "observation_ids": [observation_a["id"], observation_b["id"]],
                    "evidence_ids": [evidence_a["id"], evidence_b["id"]],
                    "state_proposal_ids": [],
                    "state_decision_ids": [],
                    "artifact_refs": [],
                    "outcome": "completed",
                    "summary": "Invalid mixed transaction.",
                },
            )

    def test_verify_detects_a_corrupt_materialized_state_projection(self):
        evidence = self.evidence()
        self.accept(self.proposal("unknown", "exposed", [evidence["id"]]))
        state_path = self.root / ".learning" / "runtime" / "state.json"
        state = runtime._read_json(state_path)
        state["concepts"]["bayes-base-rate"]["state"] = "transferable"
        runtime._write_json(state_path, state)

        self.assertIn("state.json does not match the accepted receipt chain", runtime.verify_runtime(self.root))


if __name__ == "__main__":
    unittest.main()
