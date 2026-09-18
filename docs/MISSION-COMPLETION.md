# Mission Completion Gate

Mission completion is an evidence-backed lifecycle transition, not a chat
sentiment or a renamed Archive action. The Completion Gate joins explicit
Mission criteria to immutable Runtime Evidence and archives the retained
Project only after every required capability passes.

## Authority boundary

The Agent decides which learner action to request and interprets it through the
normal Runtime assessment path. The Completion Gate does not teach or grade.
It deterministically checks already-recorded Evidence against declared
thresholds:

```text
learner action
      ↓
Observation → EvidenceReceipt
                    ↓
Mission criterion thresholds
                    ↓
Completion Gate → immutable completion.json
                    ↓
Mission completed + Project archived
```

Evidence remains scoped to the selected Mission. Cross-Project weak priors,
UI interaction telemetry, an Agent's confidence, and linked-but-nonqualifying
receipts cannot satisfy the gate.

## Required shape

A configured Mission must have at least two required criteria:

- one `feynman` reconstruction criterion;
- one independent `performance`, `application`, or `transfer` criterion.

The same single Evidence receipt cannot satisfy both responsibilities. This
prevents one polished answer from being treated simultaneously as structural
explanation and independent performance.

Supported criterion kinds are:

| Kind | Policy floor |
|---|---|
| `feynman` | explanation, independent, at most light scaffolding |
| `performance` | application, independent, at most light scaffolding |
| `application` | application, independent, at most light scaffolding |
| `transfer` | transfer in a novel context, independent |
| `retrieval` | delayed recall, independent |

A criterion may demand stronger dimensions, multiple qualifying receipts, or
specific learner-output forms through optional `artifact_forms`. An empty or
omitted list means the form is unrestricted. For example, a programming
performance criterion can require `["code", "executed_code"]`, so prose about
an implementation cannot satisfy “can write code”. Use `["executed_code"]`
only when actual execution is part of the capability; a code block alone is
recorded as `code`.

Optional criteria are recorded but do not block completion.

## Configure and inspect

`criteria-set` accepts a JSON object containing only `criteria`. For example:

```json
{
  "criteria": [
    {
      "id": "explain-bayes",
      "capability": "Reconstruct Bayes without borrowed jargon",
      "kind": "feynman",
      "required": true,
      "minimum_level": "explanation",
      "max_scaffolding": "light",
      "minimum_context": "same",
      "minimum_delay": "immediate",
      "minimum_independence": "independent",
      "minimum_evidence": 1,
      "evidence_ids": ["ev_example_explanation"]
    },
    {
      "id": "apply-bayes",
      "capability": "Use Bayes in a representative decision",
      "kind": "application",
      "required": true,
      "minimum_level": "application",
      "max_scaffolding": "light",
      "minimum_context": "varied",
      "minimum_delay": "immediate",
      "minimum_independence": "independent",
      "minimum_evidence": 1,
      "artifact_forms": [],
      "evidence_ids": ["ev_example_application"]
    }
  ]
}
```

```bash
python tools/learning.py criteria-set completion-criteria.json
python tools/learning.py completion-status
python tools/learning.py complete-project [expected-project-id]
```

The optional Project ID protects UI and automation callers from completing a
different Project after a stale selection change.

Criteria may be refined while the Project and Mission are active. Completion
freezes their final form, including cited Evidence, in
`missions/<mission-id>/completion.json`. The completion record is never
rewritten.

## Complete versus Archive

`complete-project` is the verified transition. It refuses completion while a
learner response awaits assessment, while required criteria are unqualified,
or when Feynman and performance evidence are not distinct. Success changes the
Mission to `completed`, archives the Project, and schedules retained
maintenance.

`archive-project` remains an administrative storage transition. It may pause a
learning line without claiming the Completion Gate passed. Product surfaces
must not label a manual archive as verified Mission completion.

Archive is not deletion. Maps, materials, artifacts, receipts, learner state,
and the completion record remain local. A later maintenance study may append
new scoped Evidence through the existing maintenance lifecycle. Automated
spaced scheduling and reopening policy remain separate future work.
