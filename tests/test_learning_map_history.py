import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools import learning_map, learning_map_history, project_lifecycle, project_store, runtime


REPO_ROOT = Path(__file__).resolve().parents[1]


class LearningMapHistoryTests(unittest.TestCase):
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
            "I compare the prior populations before conditioning.",
        )
        result = runtime.advance_learning_turn(
            self.root,
            decision["id"],
            {
                "assessment": {
                    "level": "explanation",
                    "outcome": "supports",
                    "failure_mode": "none",
                    "result_summary": "The learner used both conditioned populations.",
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
                    "frontier_hypothesis": "Conditional direction is the nearest dependency.",
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

    def _first_payload(self):
        return {
            "rationale": "Conditional probability is the nearest prerequisite.",
            "evidence_ids": [self.evidence_id],
            "frontier": ["bayes-reasoning"],
            "nodes": [
                {
                    "id": "conditional-probability",
                    "label": "Conditional probability",
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

    def _second_payload(self):
        payload = self._first_payload()
        payload["rationale"] = "Transfer is now the next route after Bayes reasoning."
        payload["nodes"][1]["label"] = "Posterior Bayes reasoning"
        payload["nodes"].append({
            "id": "novel-transfer",
            "label": "Novel-context transfer",
            "kind": "procedure",
            "mission_relevance": "core",
        })
        payload["edges"].append({
            "id": "bayes-to-transfer",
            "source": "bayes-reasoning",
            "target": "novel-transfer",
            "relation": "transfer",
            "confidence": "medium",
        })
        payload["frontier"] = ["novel-transfer"]
        return payload

    def test_history_reports_only_meaningful_node_revision_events(self):
        learning_map.update_learning_map(self.root, self._first_payload())
        learning_map.update_learning_map(self.root, self._second_payload())

        history = learning_map_history.node_history(self.root, "bayes-reasoning")

        self.assertEqual(history["project_id"], "bayes")
        self.assertEqual(history["current_revision"], 2)
        self.assertEqual([event["revision"] for event in history["events"]], [2, 1])
        newest, first = history["events"]
        self.assertIn("node_changed", newest["changes"])
        self.assertIn("left_frontier", newest["changes"])
        self.assertIn("relations_changed", newest["changes"])
        self.assertEqual(newest["before"]["label"], "Bayes reasoning")
        self.assertEqual(newest["after"]["label"], "Posterior Bayes reasoning")
        self.assertTrue(first["after"]["frontier"])
        self.assertIn("added", first["changes"])
        self.assertNotIn("state", json.dumps(history))

    def test_relation_only_change_is_visible_even_when_node_fields_do_not_change(self):
        first = self._first_payload()
        learning_map.update_learning_map(self.root, first)
        second = self._first_payload()
        second["rationale"] = "The dependency confidence weakened after contradictory structure evidence."
        second["edges"][0]["confidence"] = "medium"
        learning_map.update_learning_map(self.root, second)

        history = learning_map_history.node_history(self.root, "conditional-probability")

        self.assertEqual(history["events"][0]["changes"], ["relations_changed"])
        self.assertIn("high", history["events"][0]["before"]["relations"][0])
        self.assertIn("medium", history["events"][0]["after"]["relations"][0])

    def test_history_is_readable_while_project_is_paused(self):
        learning_map.update_learning_map(self.root, self._first_payload())
        project_lifecycle.pause_project(self.root, "bayes")

        history = learning_map_history.node_history(self.root, "bayes-reasoning")

        self.assertEqual(history["current_revision"], 1)
        self.assertEqual(history["events"][0]["revision"], 1)

    def test_history_fails_closed_when_current_map_diverges_from_immutable_history(self):
        learning_map.update_learning_map(self.root, self._first_payload())
        context = project_store.resolve_project_context(self.root)
        assert context.learning_map_path is not None
        revision_zero = context.learning_map_path.parent / "revisions" / "000000.json"
        context.learning_map_path.write_text(revision_zero.read_text(encoding="utf-8"), encoding="utf-8")

        with self.assertRaisesRegex(
            learning_map_history.LearningMapHistoryError,
            "does not match immutable history",
        ):
            learning_map_history.node_history(self.root, "bayes-reasoning")

    def test_history_limit_returns_latest_meaningful_events(self):
        learning_map.update_learning_map(self.root, self._first_payload())
        learning_map.update_learning_map(self.root, self._second_payload())

        history = learning_map_history.node_history(self.root, "bayes-reasoning", limit=1)

        self.assertEqual(len(history["events"]), 1)
        self.assertEqual(history["events"][0]["revision"], 2)
        with self.assertRaisesRegex(learning_map_history.LearningMapHistoryError, "limit"):
            learning_map_history.node_history(self.root, "bayes-reasoning", limit=0)


if __name__ == "__main__":
    unittest.main()
