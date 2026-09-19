# Learner Evidence Privacy

AbleArc depends on persistent learner modeling, which means real use can produce sensitive educational context even when no conventional secret is present. The repository is public; raw learner evidence is stored locally and Git-ignored by default. Configuring a remote Provider is an explicit choice to send the minimized pending-turn context needed for assessment to that Provider.

## Three layers

### 1. `.learning/` — operational learner state

Contains the state needed to teach the current learner:

- mission and constraints;
- learner-relevant preferences;
- roadmap;
- current frontier;
- misconceptions and uncertainty;
- evidence that affects future teaching decisions.

This directory is Git-ignored by default.

When the official Workspace Provider adapter is enabled, the current Mission,
Decision, learner Observation, and learner-state projection are sent to the
configured endpoint. They remain locally persisted, but are no longer
local-only in transit or at the Provider. Choose the endpoint and its data
policy accordingly; do not enable it for material that must never leave the
machine. The headless external-Agent flow remains available without this
transport.

### 2. `.dogfooding/` — raw evaluation evidence

Contains local research/evaluation material such as:

- copies of `ARC.md` and `SESSION.md` filled for real use;
- decisive interaction excerpts when genuinely necessary;
- local arc review notes;
- evidence provenance used to decide whether a runtime problem is real.

This directory is also Git-ignored by default.

### 3. public repository evidence

Public commits should contain only what is necessary to improve or verify the protocol:

- anonymized/minimized failure descriptions;
- behavioral acceptance scenarios;
- aggregate observations;
- promotion records that do not expose the learner;
- protocol changes and their general rationale.

## Do not commit by default

Avoid committing:

- names, usernames, emails, student IDs, account identifiers;
- raw chat transcripts;
- private messages or linked-account data;
- grades or assessment records tied to a person;
- private course materials or instructor-only content;
- unpublished paper/manuscript text without permission;
- credentials, tokens, private repository content, or proprietary code;
- unrelated personal details captured during tutoring;
- learner-model speculation that is not needed to justify a protocol change.

## Minimize before sharing

When a real interaction reveals a useful runtime failure, reduce the evidence to the smallest form that preserves the teaching decision.

Prefer:

```text
Observed behavior:
Learner could apply the formula in the original representation but failed after a representation switch.

Runtime issue:
State remained `stable` and the tutor skipped structural repair.

Failure class:
F5 verification / mastery inference.
```

rather than a complete transcript.

If exact wording is necessary to understand the failure, quote only the smallest relevant excerpt and remove identifying/contextual details.

## Separate learner failure from runtime evidence

A public failure case is about the **runtime behavior**, not a dossier about the learner. Describe only the learner evidence needed to show why the runtime decision was good or bad.

Bad public artifact:

```text
long profile of everything the learner struggled with
```

Better:

```text
state assumed prerequisite X was stable;
a later independent task falsified that assumption;
runtime failed to revise the roadmap.
```

## Synthetic scenarios

Synthetic cases are useful for regression tests under `tests/`.

They must be labeled/understood as synthetic acceptance scenarios and must not be counted toward:

- real longitudinal arc completion;
- capability-delta claims;
- evidence that a real learner improved;
- evidence frequency used to justify a general protocol change.

A synthetic scenario can verify that a proposed rule behaves coherently. It cannot prove that the rule solves a real learning problem.

## Public promotion record

When a protocol change is justified by real evidence, a public `PROMOTION.md`-style record should normally contain:

- failure category;
- number and diversity of independent observations;
- anonymized observable behavior;
- consequence for teaching;
- smallest layer changed;
- regression scenario;
- uncertainty/limits.

It should not require publishing the private arc records that produced the conclusion.

## Explicit opt-in

A learner may intentionally choose to version their own `.learning/` or evaluation records. That is an explicit repository/user decision, not the default behavior of AbleArc.


## Provider credentials

Web-configured Provider credentials are operational secrets, not learner evidence. They are stored separately from `.learning/` under the Git-ignored:

```text
.ablearc-local/provider-settings.json
```

The browser receives Provider metadata but never receives the persisted API key after save. Environment-based deployment credentials remain outside this file and take precedence when configured.

Do not include `.ablearc-local/` in learner-state exports, dogfooding evidence, bug reports, or shared archives.
