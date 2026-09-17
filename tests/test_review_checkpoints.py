import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools import review_checkpoints


def nested_keys(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield str(key)
            yield from nested_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from nested_keys(child)


class ReviewCheckpointTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.arc = self.root / ".dogfooding" / "bayes-arc"
        (self.arc / "sessions").mkdir(parents=True)
        (self.arc / "sessions" / "001.md").write_text(
            "# Session 1\n\nDelayed retrieval observed.\n",
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def report(self):
        return {
            "project_id": "bayes",
            "runtime_revision": 3,
            "observation_count": 1,
            "observations": [
                {
                    "evidence_id": "ev_delayed_1",
                    "concept_id": "bayes-base-rate",
                    "state_before": "developing",
                    "level": "explanation",
                    "outcome": "supports",
                    "scaffolding": "none",
                    "context": "varied",
                    "independence": "independent",
                }
            ],
            "interpretation": "descriptive_only_no_review_priority",
        }

    def test_captures_latest_session_once_without_scheduler_fields(self):
        with patch.object(
            review_checkpoints.review_observations,
            "review_observations",
            return_value=self.report(),
        ):
            path, payload = review_checkpoints.capture_review_checkpoint(
                self.root,
                self.arc.name,
            )

        self.assertEqual(path, self.arc / "review-observations" / "001.json")
        self.assertEqual(payload["kind"], "review-observation-checkpoint")
        self.assertEqual(payload["session_id"], "001")
        self.assertEqual(payload["session_record"], "sessions/001.md")
        self.assertEqual(payload["project_id"], "bayes")
        self.assertEqual(payload["runtime_revision"], 3)
        self.assertEqual(payload["observation_count"], 1)
        self.assertEqual(payload["interpretation"], "descriptive_only_no_review_priority")
        persisted = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(persisted["observations"], payload["observations"])
        keys = set(nested_keys(persisted))
        for prohibited in ("review_priority", "retention_score", "due_at", "next_review"):
            self.assertNotIn(prohibited, keys)

        with patch.object(
            review_checkpoints.review_observations,
            "review_observations",
            return_value=self.report(),
        ):
            with self.assertRaisesRegex(
                review_checkpoints.ReviewCheckpointError,
                "already exists",
            ):
                review_checkpoints.capture_review_checkpoint(self.root, self.arc.name)

    def test_new_session_gets_a_new_checkpoint_without_rewriting_prior_snapshot(self):
        with patch.object(
            review_checkpoints.review_observations,
            "review_observations",
            return_value=self.report(),
        ):
            first_path, _ = review_checkpoints.capture_review_checkpoint(self.root, self.arc.name)

        first_contents = first_path.read_text(encoding="utf-8")
        (self.arc / "sessions" / "002.md").write_text(
            "# Session 2\n\nAnother delayed revisit.\n",
            encoding="utf-8",
        )
        second_report = self.report()
        second_report["runtime_revision"] = 4
        second_report["observation_count"] = 2
        second_report["observations"] = second_report["observations"] * 2
        with patch.object(
            review_checkpoints.review_observations,
            "review_observations",
            return_value=second_report,
        ):
            second_path, payload = review_checkpoints.capture_review_checkpoint(
                self.root,
                self.arc.name,
            )

        self.assertEqual(second_path.name, "002.json")
        self.assertEqual(payload["session_id"], "002")
        self.assertEqual(payload["runtime_revision"], 4)
        self.assertEqual(first_path.read_text(encoding="utf-8"), first_contents)

    def test_rejects_non_descriptive_report_boundary(self):
        report = self.report()
        report["interpretation"] = "priority_ready"
        with patch.object(
            review_checkpoints.review_observations,
            "review_observations",
            return_value=report,
        ):
            with self.assertRaisesRegex(
                review_checkpoints.ReviewCheckpointError,
                "descriptive-only boundary",
            ):
                review_checkpoints.capture_review_checkpoint(self.root, self.arc.name)
        self.assertFalse((self.arc / "review-observations" / "001.json").exists())

    def test_rejects_symlinked_checkpoint_directory(self):
        outside = self.root / "outside"
        outside.mkdir()
        try:
            (self.arc / "review-observations").symlink_to(outside, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("symbolic links are unavailable on this platform")

        with patch.object(
            review_checkpoints.review_observations,
            "review_observations",
            return_value=self.report(),
        ):
            with self.assertRaisesRegex(
                review_checkpoints.ReviewCheckpointError,
                "symbolic link",
            ):
                review_checkpoints.capture_review_checkpoint(self.root, self.arc.name)


if __name__ == "__main__":
    unittest.main()
