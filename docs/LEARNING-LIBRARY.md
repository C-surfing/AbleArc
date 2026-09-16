# Typed Learning Library

The Learning Library keeps small, reusable knowledge assets produced during a
Project. It is not a transcript archive and it does not turn every Agent answer
into a note. A material is worth saving only when the learner has a concrete
reason to return to it.

## Authority boundary

Three objects have deliberately different roles:

| Object | Purpose | Learner-state authority |
|---|---|---|
| Runtime Evidence | Interprets one assessed learner action | May ground a state proposal |
| LearningArtifact | Supports an interactive cognitive move | None by itself |
| LearningMaterial | Preserves a reusable explanation, derivation, source, or final output | None |

A saved material cannot prove mastery, update the roadmap, or satisfy a
Completion Gate. Evidence-linked materials cite the immutable Runtime receipts
that motivated them; source-grounded materials retain explicit source
references. At least one form of provenance is required.

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
Paused and otherwise archived Projects remain read-only. Project lifecycle
transitions and material writes share one lock, so archival cannot race a save.

The Project library may retain materials from more than one Mission. Every
record keeps its originating `mission_id` and any Evidence must belong to that
same selected Mission when the material is created.

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

## Workspace projection

The Workspace may show validated titles, summaries, return reasons, and
provenance counts. It does not execute or inject stored Markdown into the page.
The full body remains a local material for an Agent or a future dedicated
reader.

Final Learning Pack generation is intentionally deferred. It should compose
selected typed materials and verified completion provenance, not synthesize a
large end-of-project note from the transcript.
