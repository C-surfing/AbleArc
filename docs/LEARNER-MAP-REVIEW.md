# Learner-facing Map + Review v1

Status: **first learner-facing projection slice**

The canonical LearningMap and Runtime state remain unchanged. This slice adds a learner-oriented projection that answers:

- where am I now?
- what appears stable?
- what is still forming?
- is a prerequisite blocking the frontier?
- what becomes plausible next?

The Today surface derives these answers from the existing map topology plus accepted mastery overlay. It does not create a second learner model.

## Map projection

The learner summary groups nodes into:

- current frontier;
- stable / transferable knowledge;
- exposed / developing knowledge;
- prerequisite blockers for the current frontier;
- next directions reachable from the current frontier.

The full Map inspector also uses learner-facing wording: current status, prerequisites, and possible next directions. Revision/proposal mechanics remain available in the deeper Workspace where needed, but are not the primary explanation.

## Review Suggestions

Review v1 is descriptive, not a scheduler.

It uses existing `ReviewCandidate` signals and produces a bounded retrieval suggestion. The learner can choose:

- **Review now** — reveal a short retrieval prompt;
- **Not today** — hide the suggestion for the current rendered view;
- **Skip** — hide the suggestion for the current rendered view.

These interactions are deliberately ephemeral in v1. They do not:

- assign a due date;
- implement SM-2 / FSRS;
- write mastery;
- create Evidence;
- alter the LearningMap;
- send notifications.

A future scheduling system requires separate evidence that descriptive review is useful but insufficient.

## Authority

```text
canonical Map topology
        +
accepted Runtime learner state
        ↓
learner-facing projection
        ↓
Today / Map / Review UI
```

The projection is read-only. UI actions remain operational state unless the learner later performs an actual assessed retrieval through the normal Runtime path.
