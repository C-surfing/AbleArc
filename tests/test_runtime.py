import io
import json
from contextlib import redirect_stderr, redirect_stdout
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
                "concept_ids": ["bayes-base-rate"],
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

    def advance_payload(self):
        return {
            "assessment": {
                "level": "explanation",
                "outcome": "supports",
                "result_summary": "You used the base rate correctly; the denominator explanation is still incomplete.",
                "scaffolding": "none",
                "context": "same",
                "delay": "immediate",
                "independence": "same_form",
                "supports": ["uses the prior in posterior reasoning"],
                "contradicts": [],
                "confidence": "medium",
                "assessor": "teach-agent:test",
            },
            "next_decision": {
                "target": "Explain the Bayes denominator",
                "frontier_hypothesis": "The learner uses the prior but has not explained the competing populations.",
                "uncertainty": "medium",
                "move": "derive",
                "rationale": "Reconstructing the denominator tests the remaining causal gap.",
                "learner_action": "Explain why true and false positives both appear in the denominator.",
                "representation": {
                    "kind": "frequency_tree",
                    "purpose": "Keep both competing populations visible.",
                },
                "expected_evidence": "The learner names both positive branches and their roles.",
                "falsification_signal": "The learner includes only true positives in the denominator.",
            },
        }

    def artifact_payload(self):
        return {
            "id": "art_bayes_frequency_tree",
            "renderer": "frequency_tree_v1",
            "title": "How the base rate changes a positive result",
            "concept_ids": ["bayes-base-rate"],
            "learning_goal": "See why a rarer condition lowers the posterior even when the test is accurate.",
            "inference_prompt": "Move prevalence down. Which positive branch changes enough to move the posterior?",
            "success_evidence": "The learner explains the posterior using both true and false positive populations.",
            "authored_by": "teach-agent:test",
            "prediction": {
                "prompt": "If prevalence falls, what happens to the posterior?",
                "options": [
                    {"id": "falls", "label": "It falls"},
                    {"id": "stays", "label": "It stays the same"},
                    {"id": "rises", "label": "It rises"},
                ],
            },
            "payload": {
                "population": 10000,
                "prevalence": 0.01,
                "sensitivity": 0.99,
                "false_positive_rate": 0.05,
                "prevalence_min": 0.001,
                "prevalence_max": 0.1,
                "prevalence_step": 0.001,
                "labels": {
                    "population": "people",
                    "condition": "condition present",
                    "complement": "condition absent",
                    "positive": "true positive",
                    "false_positive": "false positive",
                },
            },
        }

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

    def test_verify_fresh_repo_is_read_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            fresh = Path(tmp)
            self.assertEqual(runtime.verify_runtime(fresh), [])
            self.assertFalse((fresh / ".learning").exists())

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

    def test_bootstrap_mission_creates_an_honest_actionable_probe(self):
        decision = runtime.bootstrap_mission_decision(
            self.root,
            "Read an empirical ML paper and challenge its causal claims",
        )

        self.assertEqual(decision["move"], "probe")
        self.assertEqual(decision["concept_ids"], ["mission-entry"])
        self.assertEqual(decision["uncertainty"], "high")
        self.assertEqual(decision["evidence_used"], [])
        self.assertIn("unknown", decision["frontier_hypothesis"])
        self.assertEqual(runtime._current_state(self.root)["concepts"], {})

        with self.assertRaisesRegex(runtime.RuntimeContractError, "already has"):
            runtime.bootstrap_mission_decision(self.root, "A replacement mission")

    def test_bootstrap_mission_can_read_the_explicit_goal_from_markdown(self):
        learning = self.root / ".learning"
        learning.mkdir(exist_ok=True)
        (learning / "MISSION.md").write_text(
            "# Learning Mission\n\n- Goal: Derive backpropagation from the chain rule\n",
            encoding="utf-8",
        )

        decision = runtime.bootstrap_mission_decision(self.root)

        self.assertEqual(decision["target"], "Locate your first useful frontier")
        self.assertIn("representative attempt", decision["rationale"])
        self.assertNotIn("why", runtime.mission_context(self.root))

    def test_bootstrap_response_can_ground_the_first_domain_specific_move(self):
        decision = runtime.bootstrap_mission_decision(self.root, "Challenge causal claims")
        runtime.record_learner_response(
            self.root,
            decision["id"],
            "I can inspect controls, but I am unsure how hidden confounding changes the claim.",
        )
        result = runtime.advance_learning_turn(
            self.root,
            decision["id"],
            {
                "assessment": {
                    "level": "recognition",
                    "outcome": "inconclusive",
                    "result_summary": "The starting point is located; no domain mastery is inferred yet.",
                    "scaffolding": "none",
                    "context": "same",
                    "delay": "immediate",
                    "independence": "same_form",
                    "supports": ["frontier located around hidden confounding"],
                    "contradicts": [],
                    "confidence": "medium",
                    "assessor": "teach-agent:test",
                },
                "next_decision": {
                    "concept_ids": ["hidden-confounding"],
                    "target": "Hidden confounding",
                    "frontier_hypothesis": "The learner recognizes controls but cannot yet test an omitted common cause.",
                    "uncertainty": "medium",
                    "move": "contrast",
                    "rationale": "A matched causal contrast can expose what observed controls cannot rule out.",
                    "learner_action": "Compare two causal diagrams and identify which claim is not identified.",
                    "representation": {
                        "kind": "causal_diagram",
                        "purpose": "Make the hidden common cause inspectable.",
                    },
                    "expected_evidence": "The learner identifies the open backdoor path.",
                    "falsification_signal": "The learner treats observed balance as proof of no confounding.",
                },
            },
        )

        self.assertEqual(result["evidence"]["concept_ids"], ["mission-entry"])
        self.assertEqual(result["next_decision"]["concept_ids"], ["hidden-confounding"])
        self.assertIn(result["evidence"]["id"], result["next_decision"]["evidence_used"])
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_assessed_supporting_evidence_enters_state_authority_path(self):
        decision = self.decision()
        runtime.record_learner_response(
            self.root,
            decision["id"],
            "The prior changes the reference population, so false positives compete differently.",
        )

        result = runtime.advance_learning_turn(
            self.root,
            decision["id"],
            {
                **self.advance_payload(),
                "state_candidate_policy": "evidence-conservative-v0.1",
            },
        )

        self.assertEqual(len(result["state_proposals"]), 1)
        proposal = result["state_proposals"][0]
        self.assertEqual(proposal["before"], "unknown")
        self.assertEqual(proposal["after"], "exposed")
        self.assertEqual(proposal["evidence_ids"], [result["evidence"]["id"]])
        self.assertEqual(len(result["state_decisions"]), 1)
        authority = result["state_decisions"][0]
        self.assertEqual(authority["decision"], "accepted")
        self.assertEqual(
            authority["authority"],
            {"type": "runtime_policy", "id": "low-risk-v0.1"},
        )
        self.assertEqual(
            runtime.rebuild_state(self.root)["concepts"]["bayes-base-rate"]["state"],
            "exposed",
        )
        self.assertEqual(result["turn"]["state_proposal_ids"], [proposal["id"]])
        self.assertEqual(result["turn"]["state_decision_ids"], [authority["id"]])
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_stronger_followup_evidence_creates_reviewable_developing_proposal(self):
        first = self.decision()
        runtime.record_learner_response(
            self.root,
            first["id"],
            "The prior changes the competing populations.",
        )
        first_result = runtime.advance_learning_turn(
            self.root,
            first["id"],
            {
                **self.advance_payload(),
                "state_candidate_policy": "evidence-conservative-v0.1",
            },
        )
        second = first_result["next_decision"]
        runtime.record_learner_response(
            self.root,
            second["id"],
            "Both true positives and false positives belong in the denominator.",
        )

        second_result = runtime.advance_learning_turn(
            self.root,
            second["id"],
            {
                **self.advance_payload(),
                "state_candidate_policy": "evidence-conservative-v0.1",
            },
        )

        self.assertEqual(len(second_result["state_proposals"]), 1)
        proposal = second_result["state_proposals"][0]
        self.assertEqual((proposal["before"], proposal["after"]), ("exposed", "developing"))
        self.assertEqual(second_result["state_decisions"], [])
        self.assertEqual(runtime.state_transition_risk(self.root, proposal), "medium")
        self.assertEqual(
            runtime.rebuild_state(self.root)["concepts"]["bayes-base-rate"]["state"],
            "exposed",
        )
        self.assertEqual(second_result["turn"]["state_proposal_ids"], [proposal["id"]])
        self.assertEqual(second_result["turn"]["state_decision_ids"], [])
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_inconclusive_or_contradicting_evidence_does_not_auto_change_state(self):
        decision = self.decision()
        runtime.record_learner_response(self.root, decision["id"], "I am not sure.")
        inconclusive = self.advance_payload()
        inconclusive["assessment"] = {
            **inconclusive["assessment"],
            "outcome": "inconclusive",
            "supports": [],
        }
        inconclusive["state_candidate_policy"] = "evidence-conservative-v0.1"
        result = runtime.advance_learning_turn(self.root, decision["id"], inconclusive)
        self.assertEqual(result["state_proposals"], [])
        self.assertEqual(result["state_decisions"], [])
        self.assertEqual(runtime.rebuild_state(self.root)["concepts"], {})

        next_decision = result["next_decision"]
        runtime.record_learner_response(
            self.root,
            next_decision["id"],
            "Sensitivity is the posterior probability.",
        )
        contradicting = self.advance_payload()
        contradicting["assessment"] = {
            **contradicting["assessment"],
            "outcome": "contradicts",
            "supports": [],
            "contradicts": ["confuses sensitivity with posterior"],
        }
        contradicting["state_candidate_policy"] = "evidence-conservative-v0.1"
        contradicted = runtime.advance_learning_turn(
            self.root,
            next_decision["id"],
            contradicting,
        )
        self.assertEqual(contradicted["state_proposals"], [])
        self.assertEqual(contradicted["state_decisions"], [])
        self.assertEqual(runtime.rebuild_state(self.root)["concepts"], {})
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_observation_and_evidence_are_distinct_immutable_receipts(self):
        evidence = self.evidence()
        observation = runtime.load_receipt(self.root, "observation", evidence["observation_id"])

        self.assertEqual(observation["kind"], "observation")
        self.assertEqual(evidence["kind"], "evidence")
        self.assertNotIn("level", observation)
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_evidence(self.root, evidence)

    def test_learner_response_facade_uses_decision_context_and_is_single_use(self):
        decision = self.decision()
        observation = runtime.record_learner_response(
            self.root,
            decision["id"],
            "The base rate changes how many false positives compete with true positives.",
        )

        self.assertEqual(observation["concept_ids"], ["bayes-base-rate"])
        self.assertEqual(observation["learner_action"], decision["learner_action"])
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learner_response(self.root, decision["id"], "A second answer")

    def test_learner_response_rejects_empty_or_oversized_input(self):
        decision = self.decision()
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learner_response(self.root, decision["id"], "   ")
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learner_response(self.root, decision["id"], "x" * 12001)

    def test_unanswered_decisions_exposes_action_context_until_response(self):
        decision = self.decision()

        open_decisions = runtime.unanswered_decisions(self.root)

        self.assertEqual(len(open_decisions), 1)
        self.assertEqual(open_decisions[0]["id"], decision["id"])
        self.assertEqual(open_decisions[0]["concept_ids"], decision["concept_ids"])
        self.assertEqual(open_decisions[0]["learner_action"], decision["learner_action"])

        runtime.record_learner_response(
            self.root,
            decision["id"],
            "The prior changes the candidate pool.",
        )
        self.assertEqual(runtime.unanswered_decisions(self.root), [])

    def test_agent_cli_respond_requires_explicit_attribution_confirmation(self):
        decision = self.decision()
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            code = runtime.main([
                "--repo",
                str(self.root),
                "respond",
                decision["id"],
                "The prior changes the candidate pool.",
            ])
        self.assertEqual(code, 2)
        self.assertIn("--confirm-attribution", stderr.getvalue())
        self.assertEqual(
            [
                item
                for item in runtime.list_receipts(self.root, "observation")
                if item.get("source") == "learner"
            ],
            [],
        )

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            code = runtime.main([
                "--repo",
                str(self.root),
                "respond",
                decision["id"],
                "The prior changes the candidate pool.",
                "--confirm-attribution",
            ])
        self.assertEqual(code, 0)
        receipt = json.loads(stdout.getvalue())
        self.assertEqual(receipt["decision_id"], decision["id"])

    def test_pending_turn_exposes_response_and_clears_after_agent_advance(self):
        decision = self.decision()
        response = runtime.record_learner_response(self.root, decision["id"], "The prior changes the pool size.")

        pending = runtime.pending_learner_turn(self.root)
        self.assertEqual(pending["decision"]["id"], decision["id"])
        self.assertEqual(pending["observation"]["id"], response["id"])

        runtime.advance_learning_turn(self.root, decision["id"], self.advance_payload())
        self.assertIsNone(runtime.pending_learner_turn(self.root))

    def test_agent_advance_records_feedback_closes_turn_and_issues_grounded_next_move(self):
        decision = self.decision()
        response = runtime.record_learner_response(self.root, decision["id"], "The prior changes the pool size.")

        payload = self.advance_payload()
        payload["transport"] = {
            "provider": "openai-compatible",
            "model": "fixture-model",
            "attempt_count": 2,
            "duration_ms": 20600,
        }
        result = runtime.advance_learning_turn(self.root, decision["id"], payload)

        self.assertEqual(result["evidence"]["observation_id"], response["id"])
        self.assertEqual(result["turn"]["decision_id"], decision["id"])
        self.assertEqual(result["turn"]["outcome"], "completed")
        self.assertEqual(result["turn"]["transport"], payload["transport"])
        self.assertIn(result["evidence"]["id"], result["next_decision"]["evidence_used"])
        self.assertEqual(result["next_decision"]["mode"], decision["mode"])
        self.assertEqual(result["next_decision"]["concept_ids"], decision["concept_ids"])
        self.assertEqual(runtime.verify_runtime(self.root), [])

        with self.assertRaises(runtime.RuntimeContractError):
            runtime.advance_learning_turn(self.root, decision["id"], self.advance_payload())

    def test_invalid_turn_transport_is_rejected_before_feedback_is_persisted(self):
        decision = self.decision()
        response = runtime.record_learner_response(self.root, decision["id"], "The prior changes the pool size.")
        payload = self.advance_payload()
        payload["transport"] = {
            "provider": "openai-compatible",
            "model": "fixture-model",
            "attempt_count": 0,
            "duration_ms": 45000,
        }

        with self.assertRaisesRegex(runtime.RuntimeContractError, "attempt_count"):
            runtime.advance_learning_turn(self.root, decision["id"], payload)

        self.assertFalse([
            item for item in runtime.list_receipts(self.root, "evidence")
            if item["observation_id"] == response["id"]
        ])

    def test_supersede_decision_closes_obsolete_move_without_deleting_response_or_creating_evidence(self):
        obsolete = self.decision()
        observation = runtime.record_learner_response(
            self.root,
            obsolete["id"],
            "I want to pivot; this move no longer matches the question I am pursuing.",
        )
        replacement = self.decision()

        turn = runtime.supersede_decision(
            self.root,
            obsolete["id"],
            replacement["id"],
            "Learner pivoted to a more relevant move.",
        )

        self.assertEqual(turn["outcome"], "abandoned")
        self.assertEqual(turn["decision_id"], obsolete["id"])
        self.assertEqual(turn["superseded_by_decision_id"], replacement["id"])
        self.assertEqual(turn["observation_ids"], [observation["id"]])
        self.assertEqual(turn["evidence_ids"], [])
        self.assertEqual(runtime.pending_learner_turn(self.root), None)
        self.assertEqual(
            [item["id"] for item in runtime.unanswered_decisions(self.root)],
            [replacement["id"]],
        )
        self.assertEqual(
            runtime.load_receipt(self.root, "observation", observation["id"])["observed_result"],
            "I want to pivot; this move no longer matches the question I am pursuing.",
        )
        self.assertEqual(runtime.list_receipts(self.root, "evidence"), [])
        self.assertEqual(runtime.verify_runtime(self.root), [])

    def test_supersede_rejects_completed_or_invalid_replacement_links(self):
        obsolete = self.decision()
        replacement = self.decision()
        with self.assertRaisesRegex(runtime.RuntimeContractError, "outcome=abandoned"):
            runtime.record_turn(
                self.root,
                {
                    "decision_id": obsolete["id"],
                    "observation_ids": [],
                    "evidence_ids": [],
                    "state_proposal_ids": [],
                    "state_decision_ids": [],
                    "artifact_refs": [],
                    "outcome": "completed",
                    "summary": "Invalid supersession marker.",
                    "superseded_by_decision_id": replacement["id"],
                },
            )
        runtime.supersede_decision(
            self.root,
            obsolete["id"],
            replacement["id"],
            "Replace the obsolete move.",
        )
        with self.assertRaisesRegex(runtime.RuntimeContractError, "terminal turn"):
            runtime.supersede_decision(
                self.root,
                obsolete["id"],
                replacement["id"],
                "Try to supersede twice.",
            )

    def test_invalid_next_move_is_rejected_before_feedback_is_persisted(self):
        decision = self.decision()
        response = runtime.record_learner_response(self.root, decision["id"], "The prior changes the pool size.")
        payload = self.advance_payload()
        del payload["next_decision"]["learner_action"]

        with self.assertRaises(runtime.RuntimeContractError):
            runtime.advance_learning_turn(self.root, decision["id"], payload)

        self.assertFalse([
            item for item in runtime.list_receipts(self.root, "evidence")
            if item["observation_id"] == response["id"]
        ])

    def test_typed_artifact_is_immutable_and_normalized_on_a_decision(self):
        artifact = runtime.record_learning_artifact(self.root, self.artifact_payload())
        payload = {
            "mode": "teach",
            "target": "Bayes base-rate reasoning",
            "concept_ids": ["bayes-base-rate"],
            "frontier_hypothesis": "The learner needs to manipulate prevalence.",
            "evidence_used": [],
            "uncertainty": "medium",
            "move": "prediction",
            "rationale": "Manipulation should expose the denominator mechanism.",
            "learner_action": "Change prevalence and explain the posterior.",
            "representation": {
                "kind": "interactive_frequency_tree",
                "purpose": "Make both positive populations visible.",
                "artifact_ref": artifact["id"],
            },
            "expected_evidence": "The learner explains both branches.",
            "falsification_signal": "The learner equates sensitivity with posterior.",
        }
        decision = runtime.record_decision(self.root, payload)

        self.assertEqual(
            decision["representation"]["artifact_ref"],
            ".learning/artifacts/art_bayes_frequency_tree.json",
        )
        self.assertEqual(runtime.load_learning_artifact(self.root, decision["representation"]["artifact_ref"]), artifact)
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learning_artifact(self.root, self.artifact_payload())

    def test_artifact_rejects_invalid_probability_semantics(self):
        payload = self.artifact_payload()
        payload["payload"]["prevalence"] = 0.5
        payload["payload"]["prevalence_max"] = 0.1
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learning_artifact(self.root, payload)

        payload = self.artifact_payload()
        payload["prediction"]["options"][1]["id"] = "falls"
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learning_artifact(self.root, payload)

    def test_legacy_v01_artifact_gets_prediction_compatibility_without_rewrite(self):
        legacy = self.artifact_payload()
        legacy.pop("prediction")
        legacy.update({
            "schema_version": "0.1",
            "kind": "learning-artifact",
            "created_at": "2026-09-15T00:00:00Z",
        })
        path = self.root / ".learning" / "artifacts" / "art_bayes_frequency_tree.json"
        runtime._write_json(path, legacy, immutable=True)

        loaded = runtime.load_learning_artifact(self.root, "art_bayes_frequency_tree")

        self.assertEqual(loaded["schema_version"], "0.1")
        self.assertEqual(loaded["prediction"]["options"][0]["id"], "falls")
        self.assertNotIn("prediction", runtime._read_json(path))

        payload = self.artifact_payload()
        payload["payload"]["false_positive_rate"] = 1.2
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learning_artifact(self.root, payload)

    def test_decision_rejects_artifact_from_another_concept(self):
        payload = self.artifact_payload()
        payload["concept_ids"] = ["unrelated-concept"]
        artifact = runtime.record_learning_artifact(self.root, payload)
        decision = self.decision()
        decision_payload = {key: value for key, value in decision.items() if key not in {"schema_version", "kind", "id", "created_at"}}
        decision_payload["representation"] = {
            "kind": "interactive_frequency_tree",
            "purpose": "Test an invalid cross-concept reference.",
            "artifact_ref": artifact["id"],
        }
        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_decision(self.root, decision_payload)

    def test_artifact_interaction_is_validated_and_preserved_on_the_observation(self):
        artifact = runtime.record_learning_artifact(self.root, self.artifact_payload())
        decision_payload = {
            "mode": "teach",
            "target": "Bayes base-rate reasoning",
            "concept_ids": ["bayes-base-rate"],
            "frontier_hypothesis": "The learner should predict before inspecting the counts.",
            "evidence_used": [],
            "uncertainty": "medium",
            "move": "prediction",
            "rationale": "Prediction makes the representation diagnostic rather than passive.",
            "learner_action": "Predict, manipulate prevalence, and explain the posterior.",
            "representation": {
                "kind": "interactive_frequency_tree",
                "purpose": "Expose the competing positive populations.",
                "artifact_ref": artifact["id"],
            },
            "expected_evidence": "The learner explains why the posterior falls.",
            "falsification_signal": "The learner equates sensitivity with posterior.",
        }
        decision = runtime.record_decision(self.root, decision_payload)
        interaction = {
            "artifact_id": artifact["id"],
            "prediction_id": "falls",
            "initial_prevalence": 0.01,
            "final_prevalence": 0.002,
        }

        observation = runtime.record_learner_response(
            self.root,
            decision["id"],
            "The true-positive branch shrank relative to false positives.",
            artifact_interaction=interaction,
        )

        self.assertEqual(observation["artifact_interaction"], interaction)
        pending = runtime.pending_learner_turn(self.root)
        self.assertEqual(pending["observation"]["artifact_interaction"]["prediction_id"], "falls")

    def test_invalid_artifact_interaction_is_rejected_before_observation_write(self):
        artifact = runtime.record_learning_artifact(self.root, self.artifact_payload())
        decision_payload = {
            "mode": "teach",
            "target": "Bayes base-rate reasoning",
            "concept_ids": ["bayes-base-rate"],
            "frontier_hypothesis": "The learner should predict before inspecting the counts.",
            "evidence_used": [],
            "uncertainty": "medium",
            "move": "prediction",
            "rationale": "Prediction makes the representation diagnostic.",
            "learner_action": "Predict and explain.",
            "representation": {
                "kind": "interactive_frequency_tree",
                "purpose": "Expose competing populations.",
                "artifact_ref": artifact["id"],
            },
            "expected_evidence": "The learner explains the posterior.",
            "falsification_signal": "The learner ignores false positives.",
        }
        decision = runtime.record_decision(self.root, decision_payload)

        with self.assertRaises(runtime.RuntimeContractError):
            runtime.record_learner_response(
                self.root,
                decision["id"],
                "An answer that must not be persisted.",
                artifact_interaction={
                    "artifact_id": artifact["id"],
                    "prediction_id": "not-an-option",
                    "initial_prevalence": 0.01,
                    "final_prevalence": 0.002,
                },
            )
        self.assertFalse(runtime.list_receipts(self.root, "observation"))

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

    def test_failed_first_attempt_can_record_exposure_without_claiming_mastery(self):
        evidence = self.evidence(
            level="recognition",
            outcome="contradicts",
            context="same",
            independence="same_form",
            result="The learner attempted the concept but used an incorrect causal model.",
        )
        proposal = self.proposal("unknown", "exposed", [evidence["id"]])

        self.assertEqual(runtime.transition_policy_issues(self.root, proposal), [])
        decision = self.accept(proposal)
        state = runtime._current_state(self.root)

        self.assertEqual(decision["decision"], "accepted")
        self.assertEqual(state["concepts"]["bayes-base-rate"]["state"], "exposed")
        self.assertEqual(state["concepts"]["bayes-base-rate"]["evidence_ids"], [evidence["id"]])

    def test_inconclusive_first_attempt_can_record_exposure(self):
        evidence = self.evidence(
            level="recognition",
            outcome="inconclusive",
            context="same",
            independence="same_form",
            result="The learner recognized the term but did not reveal a usable model.",
        )
        proposal = self.proposal("unknown", "exposed", [evidence["id"]])

        self.assertEqual(runtime.transition_policy_issues(self.root, proposal), [])
        self.accept(proposal)
        self.assertEqual(
            runtime._current_state(self.root)["concepts"]["bayes-base-rate"]["state"],
            "exposed",
        )

    def test_non_supporting_evidence_cannot_promote_beyond_exposed(self):
        first = self.evidence(level="recognition", context="same", independence="same_form")
        self.accept(self.proposal("unknown", "exposed", [first["id"]]))
        failed_application = self.evidence(outcome="contradicts")
        proposal = self.proposal("exposed", "developing", [failed_application["id"]])

        issues = runtime.transition_policy_issues(self.root, proposal)
        self.assertIn("mastery promotion requires supporting evidence", issues)
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
