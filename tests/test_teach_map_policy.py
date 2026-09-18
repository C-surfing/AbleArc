from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SKILL = REPO_ROOT / "skills" / "teach" / "SKILL.md"
ADR = REPO_ROOT / "docs" / "adr" / "0007-learning-map-proposal-review.md"


def test_teach_skill_uses_proposal_first_topology_updates():
    text = SKILL.read_text(encoding="utf-8")

    derive_command = "python tools/learning_map_proposals.py --repo . derive"
    proposal_command = "python tools/learning_map_proposals.py --repo . propose <payload>"
    direct_command = "python tools/learning.py map-update <payload>"

    assert derive_command in text
    assert proposal_command in text
    assert "the default agent path is proposal-first" in text
    assert "Let the learner-facing review path accept or reject the proposal" in text
    assert "silently bypass learner topology review" in text

    # Direct writes remain documented only as an explicit trusted/headless escape hatch.
    assert direct_command in text
    assert "reserved for explicit trusted/headless operation" in text
    assert "not the normal Teach-agent shortcut" in text


def test_teach_skill_keeps_topology_and_mastery_authority_separate():
    text = SKILL.read_text(encoding="utf-8")

    assert "It must not contain learner mastery or pixel positions" in text
    assert "A state proposal must never silently rewrite topology" in text
    assert "Do not revise the map merely because mastery changed" in text


def test_adr_requires_proposal_first_for_learner_facing_agents():
    text = ADR.read_text(encoding="utf-8")

    assert "For learner-facing Teach operation, proposal-first is mandatory" in text
    assert "must propose topology/frontier changes rather than directly call the canonical writer" in text
    assert "must not be used to bypass learner review" in text
    assert "automatic proposal\nacceptance" in text
