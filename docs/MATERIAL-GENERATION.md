# Learning Material Generation v0.1

Status: **implementation contract**

AbleArc already stores typed Learning Materials with provenance. This document defines how future
Providers / Agents should **generate** those materials without turning the active lesson into a
long-form content dump or giving generated content learner-state authority.

The teaching sequence is informed by the open-source
`walkinglabs/university-skill` project. AbleArc adopts the parts that generalize well to an
adaptive learning runtime:

```text
prerequisite bridge
      ↓
intuition
      ↓
small / low-dimensional worked example
      ↓
formal model
      ↓
implementation or boundary
      ↓
retrieval check
```

The source project targets 20-page and 40+ page coursebooks. AbleArc uses the same pedagogical
ordering at a much smaller granularity for the active lesson.

## Two scopes

### Active lesson

Purpose: help with the current frontier **now**.

Allowed material types:

- concept note;
- derivation;
- worked example;
- formula sheet;
- code artifact;
- diagram;
- misconception note;
- source note;
- Feynman explanation.

These are bounded learning objects. Typical target length is a few hundred words, plus a compact
diagram / code / derivation where appropriate. The learner should be able to use the object in
minutes.

Active lesson material is a candidate, not an automatic insertion. The UI may recommend it based on
current frontier overlap or an explicit learner selection. It must not silently interrupt the
current cognitive move.

### Library deep material

Purpose: reusable study/reference material.

This scope may grow into a longer note or coursebook-style asset. It remains in the Learning Library
and is opened deliberately. It is never injected wholesale into Focus / Learn.

A future exporter may turn a set of validated Library materials into Markdown / LaTeX / PDF, but
that export is a presentation product, not learner state.

## Generation brief

`deriveMaterialGenerationBrief(...)` builds a bounded request from:

- Mission;
- current frontier;
- frontier rationale;
- frontier concept IDs;
- learner context/self-report when available;
- current learner action;
- representation purpose;
- requested material type;
- requested scope.

The brief is intentionally a **teaching/presentation projection**. It cannot write Runtime receipts,
change the Map, or update Completion.

## Type-specific teaching sequence

The full sequence is used for concept explanations, derivations, worked examples, misconception
repair, and Feynman explanations.

Some forms shorten it:

- diagram: prerequisite -> intuition -> formal relation -> retrieval check;
- formula/source note: prerequisite -> formal model -> boundary -> retrieval check;
- code artifact: prerequisite -> intuition -> small example -> implementation/boundary -> retrieval.

This is a composition prior, not a rigid chapter template. If one step adds no learning value, the
generator may keep it extremely short rather than filling space.

## Material length bounds

Active objects remain deliberately small. Current defaults:

| Material | Active target |
| --- | ---: |
| concept note | 250–700 words |
| derivation | 300–900 |
| worked example | 300–900 |
| formula sheet | 150–500 |
| code artifact | 250–800 |
| diagram | 100–450 plus diagram |
| misconception note | 180–500 |
| source note | 180–600 |
| Feynman explanation | 250–700 |

Deep Library material may be longer, but the first implementation still bounds it to a few thousand
words per material object. A 20/40-page coursebook should be assembled from multiple materials, not
stored as one giant active-learning blob.

## Verification discipline

Borrowed from university-skill:

- numerical worked examples must actually be checked;
- executable code must be run before the material claims that it runs;
- external facts and citations must be verified from sources;
- unverified implementation claims must be labeled as unverified;
- use concrete low-dimensional numbers when a formal mechanism is otherwise too abstract;
- formalism should follow enough intuition / example to make the symbols interpretable.

AbleArc adds a stricter authority rule:

> Verification makes a **material** more trustworthy. It does not make the learner more mastered.

## Provenance contract

A persisted LearningMaterial already requires at least one source or Evidence reference.

Generation must preserve this distinction:

- `source_refs`: provenance for external/domain claims;
- `evidence_ids`: accepted learner observations that explain why this material is worth returning to;
- material body: teaching content.

An Evidence reference may motivate or contextualize the material. The material itself is not
Evidence.

## Relevance to the active lesson

`deriveMaterialLearningObjectCandidates(...)` is presentation-only.

A saved material can become an active candidate when:

1. at least one of its concept IDs intersects the current LearningMap frontier; or
2. the learner explicitly selected/curated it.

Source/Evidence provenance can break ties or slightly boost an already relevant candidate, but
**provenance alone is not topical relevance**.

Every candidate carries `autoInject: false`.

That is deliberate. The current Runtime Decision owns the cognitive move. The Host decides whether
to offer a relevant material as optional support; it does not replace the move silently.

## Mapping saved material to Learning Object families

| LearningMaterial type | learner-facing object family |
| --- | --- |
| concept_note | explanation |
| feynman_explanation | explanation |
| misconception_note | explanation |
| source_note | explanation |
| derivation | worked_example |
| worked_example | worked_example |
| formula_sheet | worked_example |
| code_artifact | worked_example |
| diagram | diagram |

This mapping is about renderer choice only. It confers no authority.

## Future Provider pipeline

The intended next integration is:

```text
WorkspaceSnapshot
      ↓
MaterialGenerationBrief
      ↓
configured Provider / Agent
      ↓
strict GeneratedMaterialDraft
      ↓
source / numeric / code validation
      ↓
existing LearningMaterial persistence contract
      ↓
Library
      ↓
frontier / learner-selected candidate
      ↓
optional Learning Object in Focus
```

The Provider must return data/content only. It must not return arbitrary executable HTML/JavaScript
for the Web Host.

## Rejection checks

Reject the generation path if:

- it creates Evidence or mastery from reading;
- it writes a 20-page response directly into the active Focus surface;
- it invents citations / DOI / sources;
- it claims code was executed when it was not;
- it chooses Library material only because it has many sources;
- it replaces the current Runtime Decision without a new validated Decision;
- it turns every concept into the same generic explanation template.
