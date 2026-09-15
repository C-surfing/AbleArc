# Typed Learning Artifacts

A `LearningArtifact` is a learner-operable representation selected for one cognitive job. It is not raw generated HTML, a lesson document, or learner state.

```text
learner state + current evidence
              ↓
       teaching decision
              ↓
       LearningArtifact
              ↓
 learner manipulates and explains
              ↓
          observation
```

## v0.1 vertical slice

The first renderer is deliberately narrow: `frequency_tree_v1`.

It first asks the learner to commit a directional prediction while the derived counts remain hidden. Only then can the learner vary prevalence while population size, sensitivity, and false-positive rate remain explicit. The Workspace derives true positives, false positives, total positive results, and the posterior. The renderer never grades the prediction; the resulting explanation still enters through **Your move** and the normal evidence loop.

This slice tests three product claims:

1. the Agent can request an interactive representation without generating executable UI code;
2. the learner can manipulate the relation the current decision is testing;
3. the same artifact remains portable across Agents because its semantics are data, not framework-specific markup.

When the explanation is submitted, the Observation also records the artifact ID, selected prediction, initial prevalence, and final explored prevalence. The Runtime validates these values against the Decision's immutable artifact before writing. This gives the assessor useful context without treating slider movement as mastery evidence.

## Contract

The current schema is [`../schemas/learning-artifact-v0.2.json`](../schemas/learning-artifact-v0.2.json). v0.2 adds a prediction commitment before reveal; the runtime and Workspace continue to load [`v0.1`](../schemas/learning-artifact-v0.1.json) artifacts with a safe frequency-tree default. A complete v0.2 example is [`../examples/learning-artifacts/bayes-frequency-tree.json`](../examples/learning-artifacts/bayes-frequency-tree.json).

Create an artifact locally:

```bash
python tools/runtime.py --repo . artifact \
  examples/learning-artifacts/bayes-frequency-tree.json
```

Then reference the returned artifact from a decision:

```json
{
  "representation": {
    "kind": "interactive_frequency_tree",
    "purpose": "Make both positive populations visible while prevalence changes.",
    "artifact_ref": "art_bayes_frequency_tree"
  }
}
```

The runtime normalizes the reference to `.learning/artifacts/<id>.json`, verifies that the decision and artifact share a concept, and records the reference in the completed Turn.

## Product boundary

- Artifacts are stored under `.learning/artifacts/`; they are not receipts and cannot promote mastery.
- v0.2 requires prediction-before-reveal; existing v0.1 frequency trees receive the same safe default at read time and are never rewritten.
- The renderer accepts data only. It does not execute Agent-authored HTML or JavaScript.
- Invalid probability values, inconsistent prevalence ranges, unknown renderers, unsafe references, and cross-concept attachments are rejected.
- When no supported artifact is available, the Workspace keeps its existing structure/evidence/contrast/flow views.
- Add a second renderer only after a real learning arc exposes a relationship that `frequency_tree_v1` cannot express.
