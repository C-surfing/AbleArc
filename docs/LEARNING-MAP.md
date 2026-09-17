# Canonical LearningMap contract

The LearningMap is an evidence-grounded, revisable hypothesis about the
knowledge route for one Project. It is not a syllabus and it is not the learner
model.

## Authority boundary

```text
map/current.json       topology + frontier authority
runtime/state.json     accepted learner-mastery authority
Workspace              read-time join of both
map/ROADMAP.md         generated human-readable projection
```

The canonical map stores typed nodes, explicit semantic edges, mission
relevance, the current frontier, and revision provenance. It never stores
mastery state, misconceptions, or layout coordinates. Those boundaries ensure
that accepting a state proposal cannot silently alter subject topology and
that revising a dependency cannot silently promote the learner.

The published schema is
[`learning-map-v0.1.json`](../schemas/learning-map-v0.1.json).

## Storage and revisions

For the selected workspace-v0.2 Project:

```text
.learning/projects/<project-id>/map/
├── current.json
├── revisions/
│   ├── 000000.json
│   ├── 000001.json
│   └── ...
└── ROADMAP.md
```

Project creation writes an honest empty revision `0`. Later revisions are
append-only. Each records its parent, rationale, same-Project Evidence IDs, and
the computed structural delta. `current.json` is the latest validated
revision. `ROADMAP.md` is regenerated after every accepted write and must not
be edited directly.

Legacy-v0.1 and migrated Projects without `current.json` remain readable
through their Markdown roadmap. Migration does not invent topology or attach
old evidence to a new claim. The first structured revision must still be
grounded in current project-local Evidence.

## Agent write path

Read the selected Project map:

```bash
python tools/learning.py map
```

After a learner action has produced an Evidence receipt, submit the full
proposed topology:

```bash
python tools/learning.py map-update map-update.json
```

The update payload contains only caller-owned semantic fields:

```json
{
  "rationale": "The explanation revealed conditional direction as the nearest prerequisite.",
  "evidence_ids": ["ev_example"],
  "frontier": ["bayes-reasoning"],
  "nodes": [
    {
      "id": "conditional-probability",
      "label": "Conditional probability",
      "kind": "concept",
      "mission_relevance": "supporting"
    },
    {
      "id": "bayes-reasoning",
      "label": "Bayes reasoning",
      "kind": "strategy",
      "mission_relevance": "core"
    }
  ],
  "edges": [
    {
      "id": "conditional-to-bayes",
      "source": "conditional-probability",
      "target": "bayes-reasoning",
      "relation": "prerequisite",
      "confidence": "high"
    }
  ]
}
```

The write boundary derives Project identity, timestamps, revision numbers, and
the delta. It rejects unknown fields, invalid references, no-op writes,
cross-Project Evidence, and writes outside the active or maintenance-study
lifecycle.

Do not run `map-update` after every turn. Use it only when Evidence changes the
topology hypothesis or frontier. A mastery-only change belongs to the Runtime
state authority path.

## Workspace rendering

The Workspace validates `current.json`, joins accepted mastery by stable node
ID, and renders the explicit edges. ELK derives a deterministic layered layout
at read time; React Flow owns interaction and display. Pixel positions are
therefore disposable presentation data and never enter the map schema.

The focused Map mode is also read-only. Selecting a node exposes its incoming
semantic dependencies, downstream unlocks, mission relevance, frontier status,
and the accepted Runtime mastery overlay. Selection, panning, zooming, and
navigation between connected nodes remain presentation state only; none of
those interactions create Evidence or write either authority.

An existing but invalid canonical map fails closed rather than silently
falling back to Markdown. Markdown fallback applies only when no canonical map
exists.

## Current boundary

This slice implements canonical storage, revision history, generated Markdown,
CLI reads/writes, Runtime overlay, explicit-edge rendering, deterministic
layout, full-screen read-only Map mode, and node inspection.

Still deferred are in-product topology revision proposal review, semantic
lenses beyond the current dependency/overlay inspection, node-level revision
history, visual before/delta/after comparison, and direct graph editing. Any
future editing surface must preserve the topology/mastery split defined here
and in ADR 0003.
