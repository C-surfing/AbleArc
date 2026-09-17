# Project roadmap

The canonical post-v0.2 product and development plan is:

- [`docs/VNEXT-ROADMAP.md`](docs/VNEXT-ROADMAP.md)

The corresponding accepted architecture boundary is:

- [`docs/adr/0008-learning-os-product-boundary.md`](docs/adr/0008-learning-os-product-boundary.md)

These documents define the current direction: evolve the first-party Web product into a daily-use **Learning OS** while preserving the provider-neutral, local-first, evidence-driven **Learning Runtime / Engine** underneath it.

Branding has since completed its separate transition: **AbleArc** is the accepted public product name and `C-surfing/AbleArc` is the canonical repository. [`docs/BRANDING.md`](docs/BRANDING.md) is the current source of truth for naming and compatibility. Pre-rename wording in the naming-transition section of `docs/VNEXT-ROADMAP.md` describes the state when that roadmap was written; it does not reopen the naming decision or override the accepted AbleArc brand.

## Current delivery checkpoint

vNext Phases 1–3 are implemented on `main`:

```text
Entry → Today + DailyContext → Focus Session
                              ↓
                     Learning Runtime
                              ↓
              response → assessment → next Decision
```

The current development checkpoint is **real learner-facing pilot validation before Phase 4**. Start with [`evaluation/FIRST-PILOT.md`](evaluation/FIRST-PILOT.md), then record longitudinal learner evidence under the private `.dogfooding/` arc and product-surface observations with [`evaluation/VNEXT-PRODUCT-DOGFOOD.md`](evaluation/VNEXT-PRODUCT-DOGFOOD.md).

Phase 4 Capture Inbox is **evidence-gated**, not the automatic next implementation step. It should be promoted only when repeated real sessions show a recurring focus/continuity failure and [`evaluation/PROMOTION.md`](evaluation/PROMOTION.md) identifies fast capture as the smallest sufficient fix. Issue [#43](https://github.com/C-surfing/AbleArc/issues/43) tracks this gate.

The broader runtime still has a separate five-domain longitudinal evidence goal tracked in Issue [#2](https://github.com/C-surfing/AbleArc/issues/2). Product pilot completion and five-domain runtime validation are related but not interchangeable.

## Evidence-gated phase semantics

Roadmap phases are **decision gates and recommended ordering**, not a mandatory feature checklist.

An evidence-gated phase may end in one of these states:

```text
promoted
collect_more_evidence / deferred
not_promoted_for_now
```

If an optional feature is not promoted, that does **not** automatically block a later phase whose learner problem, authority boundary, and implementation dependencies are independent. For example, if real Focus sessions do not show a recurring capture/continuity problem, Capture Inbox may remain `not_promoted_for_now` while an independently justified Session Close slice is evaluated next.

A phase still blocks later work when there is a real dependency: the later behavior requires its data contract, authority path, continuity mechanism, or validated user interaction. Skipping a dependency to preserve roadmap velocity is not allowed.

Promotion evidence is qualitative and behavioral rather than a fixed mechanical session count. Repeated independent observations are normally stronger than one anecdote, but a single clearly structural high-consequence failure may justify repair. The deciding questions remain: did the problem actually occur, did it materially harm learning/continuity, and is the proposed feature the smallest sufficient fix?

Older roadmap and product documents remain useful architectural history and detailed subsystem references, but when delivery priority conflicts, `docs/VNEXT-ROADMAP.md` is the source of truth unless a later accepted ADR or roadmap revision explicitly supersedes it.
