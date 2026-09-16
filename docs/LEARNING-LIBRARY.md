# Typed Learning Library

The Learning Library keeps small, reusable knowledge assets produced during a
Project. It is not a transcript archive and it does not turn every Agent answer
into a note. A material is worth saving only when the learner has a concrete
reason to return to it.

## Authority boundary

Four objects now have deliberately different roles:

| Object | Purpose | Learner-state authority |
|---|---|---|
| Runtime Evidence | Interprets one assessed learner action | May ground a state proposal |
| LearningArtifact | Supports an interactive cognitive move | None by itself |
| LearningMaterial | Preserves a reusable explanation, derivation, source, or final output | None |
| Material curation | Records an explicit learner preference about which saved materials deserve return attention | None |

A saved material cannot prove mastery, update the roadmap, or satisfy a
Completion Gate. Evidence-linked materials cite the immutable Runtime receipts
that motivated them; source-grounded materials retain explicit source
references. At least one form of provenance is required.

Material curation is even narrower: selection means only "I want this item in my
curated set." Selecting or deselecting a material cannot create Evidence,
change mastery, revise the LearningMap, schedule review, or alter Completion
status. Future pack composition may read this preference, but must not reinterpret
it as proof of learning.

## Material types

The v0.1 contract supports a deliberately small vocabulary:

| Type | Intended return value |
|---|---|
| `concept_note` | Reconstruct a compact mental model |
| `derivation` | Revisit the reasoning between formal steps |
| `worked_example` | Compare a new attempt with a complete example |
| `formula_sheet` | Retrieve definitions and invariants quickly |
| `code_artifact` | Reuse or inspect a tested implementation |
| `diagram` | Recover a relation that is clearer spatially |
| `misconception_note` | Recognize and repair a previously observed error model |
| `source_note` | Return to a cited external source and its relevance |
| `feynman_explanation` | Preserve the learner's verified final reconstruction |

`misconception_note` and `feynman_explanation` require Runtime Evidence.
`source_note` requires a source reference. All types require a short
`why_return` statement, preventing the library from becoming an undifferentiated
summary dump.

## Storage and lifecycle

Materials are immutable JSON records under:

```text
.learning/projects/<project-id>/materials/<material-id>.json
```

The Project and Mission scope is derived from the selected workspace; callers
cannot supply or override it. New materials may be written during an active
Mission or an archived Project's explicit `study_active` maintenance window.
Paused and otherwise archived Projects remain read-only for new materials.
Project lifecycle transitions and material writes share one lock, so archival
cannot race a save.

The Project library may retain materials from more than one Mission. Every
record keeps its originating `mission_id` and any Evidence must belong to that
same selected Mission when the material is created.

Material curation is stored separately from the immutable material records:

```text
.learning/projects/<project-id>/curation/materials.json
```

The curation manifest contains only Project scope, a monotonic revision, the
selected material IDs, and an update timestamp. It uses compare-and-swap
revision checks so stale Workspace actions cannot silently overwrite a newer
selection. Curation writes use the same Project lifecycle lock as material and
lifecycle writes.

Because curation is learner preference rather than learner state, it may remain
editable while the selected Project is paused or archived. This does not reopen
the Project for teaching and does not permit new LearningMaterial writes.

See [`schemas/learning-material-v0.1.json`](../schemas/learning-material-v0.1.json)
and
[`schemas/learning-material-curation-v0.1.json`](../schemas/learning-material-curation-v0.1.json).

## CLI

Save one material from a file or stdin:

```bash
python tools/learning.py material-save material.json
python tools/learning.py materials
```

Example input:

```json
{
  "id": "mat_bayes_reference_class",
  "material_type": "concept_note",
  "title": "Bayes starts with a reference class",
  "summary": "A compact explanation of why sensitivity alone cannot determine a posterior.",
  "why_return": "Use this when P(A|B) and P(B|A) begin to feel interchangeable.",
  "body_markdown": "# Reference classes\n\nStart by counting both positive branches.",
  "concept_ids": ["bayes-reasoning"],
  "evidence_ids": ["ev_example123"],
  "source_refs": [],
  "tags": ["bayes", "conditional-probability"]
}
```

The optional caller-supplied ID makes retries idempotent. Reusing an ID with
different content is rejected rather than overwriting prior material.

Curation is currently a Workspace interaction rather than a teaching command.
The server validates the selected Project, the curation revision, and the full
material detail before changing the Project-local selection manifest.

## Workspace reader

The initial Workspace projection still shows validated titles, summaries,
return reasons, and provenance counts without including the full Markdown body.
Opening one material performs an on-demand read through the validated material
reader, which re-checks Project scope, Mission scope, and referenced Runtime
Evidence before returning the body.

Stored Markdown is shown as inert plain text. It is not executed or injected as
HTML.

The reader also exposes an explicit `Select` / `Selected` curation control.
That action updates only the Project-local preference manifest. It never writes
to the material record or Runtime learner-state receipts.

## Final Learning Pack remains deferred

Final Learning Pack generation is intentionally deferred. A future pack should
compose deliberately selected typed materials together with verified completion
provenance. It should not synthesize a large end-of-project note from the
transcript, and curation alone must never be treated as evidence that a concept
was mastered.
