# ADR 0006: Save typed, provenance-aware LearningMaterials

- Status: Accepted
- Date: 2026-09-16

## Context

Projects should leave useful knowledge assets behind, but automatic chat
summaries create a low-signal note dump and blur the difference between a
learner action, its Evidence, an interactive representation, and a reference.
Final Learning Packs also need stable inputs before they can be trustworthy.

## Decision

Store Project-local `LearningMaterial` records with a small type vocabulary,
an explicit `why_return`, immutable identity, originating Mission, and at least
one Evidence or source reference. Feynman explanations and misconception notes
must cite Runtime Evidence. Materials never update learner state and never
count as Completion Evidence.

Writes are allowed only on an active Mission or inside an explicit maintenance
study. The Workspace exposes a safe summary projection but does not render the
stored Markdown body as executable UI.

## Consequences

- The library grows only through deliberate saves, not every conversation.
- Provenance and Mission scope remain inspectable after archival.
- Final Learning Packs can later compose verified materials instead of raw
  transcripts.
- A future editor or renderer must preserve immutability or introduce an
  explicit versioned replacement contract.
