# Local runner

`tools/learning.py` is a small standard-library helper for AbleArc's local workspace and longitudinal evaluation. `tools/runtime.py` records the structured learning transaction selected by Teach/Study agents. Neither tool teaches, scores learners, or selects cognitive moves.

Its job is to remove bookkeeping friction while preserving the project's privacy and evidence boundaries.

`tools/project_store.py` is the read-only storage resolver shared by upcoming
project-aware operations. It distinguishes an uninitialized workspace, the
existing unscoped v0.1 layout, and the canonical v0.2
Workspace/Project/Mission layout without creating or migrating data. See
[`../docs/PROJECT-STORAGE.md`](../docs/PROJECT-STORAGE.md).

## Migrate a legacy workspace safely

```bash
python tools/learning.py migrate-workspace
```

This copies legacy project-local state into the v0.2 Project layout, verifies
checksums and the runtime ledger, and writes `workspace.json` only as the final
activation step. Root v0.1 files remain as a recovery source. A failed
activation is moved to `.learning/migrations/failed/` and leaves legacy state
active, so the command can be retried. Optional `--project-title`,
`--project-id`, and `--mission-id` arguments control imported identity without
changing learner evidence.

## Initialize learner state

```bash
python tools/learning.py init
```

Creates missing files from `templates/` under `.learning/`, `records/`, `references/`, and the local structured runtime. Existing learner files are never overwritten.

## Start from a learner goal

The Workspace uses this high-level command for zero-state onboarding:

```bash
printf '%s' '{"goal":"Explain and apply Bayes in unfamiliar decisions","context":"Useful for product experiments"}' \
  | python tools/learning.py start-mission -
```

It initializes the local workspace if needed and replaces only an untouched `MISSION.md` template. It records the goal as `learner-explicit`, then creates one conservative `mission-entry` Decision asking for a representative attempt. This lets the learner act immediately without pretending that a domain map or prior-knowledge model already exists. An existing mission is never overwritten by this command.

For a Mission saved by an earlier version that has no Decision, create the same first move with:

```bash
python tools/runtime.py --repo . bootstrap-mission
```

The baseline response then appears through `runtime.py pending`, together with minimal explicit Mission context. A Teach agent assesses it and issues the first domain-specific Decision through `advance`.

## Record structured learning transactions

The receipt runtime preserves this inspectable chain:

```text
decision → observation → evidence → state proposal → authority decision → turn
                └────→ frontier revision → corrected decision
```

Initialize it directly when needed:

```bash
python tools/runtime.py --repo . init
```

The full command contract, authority rules, privacy boundary, and JSON schema are documented in [`../docs/RUNTIME-CONTRACT.md`](../docs/RUNTIME-CONTRACT.md).

Legacy storage continues to append unscoped v0.1 receipts. In a v0.2 Workspace,
the runtime appends v0.2 receipts and derives `workspace_id`, `project_id`, and
`mission_id` from the active manifests. Payloads cannot override this scope,
direct references cannot cross Projects, and each learner-action chain stays
inside one Mission. Project-level decisions may still cite evidence from an
earlier Mission in the same Project.

The Workspace binds the submitted response to the Decision rendered in Focus and
uses `respond-context`. For the free-text Agent CLI path, inspect the unanswered
Decisions and explicitly confirm attribution before writing:

```bash
python tools/runtime.py --repo . open-decisions
python tools/runtime.py --repo . respond <decision-id> - --confirm-attribution
```

`open-decisions` returns only current-Mission Decisions without a learner
response, including their target, concept IDs, and `learner_action`. The
confirmation flag means the Agent has checked that the latest learner message
actually answers that action; it is not a semantic similarity score performed by
Runtime. If the message belongs to a different move, do not attach it to an old
Decision.

If the Agent already presented that different move before recording it, repair
the ordering explicitly rather than pretending it was recorded first:

```bash
python tools/runtime.py --repo . late-decision decision.json "Presented before recording due to Agent ordering error."
```

The resulting workspace-v0.2 Decision carries `recorded_after_action=true` and
`late_record_reason`. Use its returned ID with the attribution-confirmed
`respond` path. The lower-level `record` commands exist for controlled
integration and debugging, not as an attribution or chronology shortcut.

Agents can consume the next unanswered response and advance the learning loop without manually assembling receipts:

```bash
python tools/runtime.py --repo . pending
python tools/runtime.py --repo . advance <decision-id> assessment.json
```

`advance` validates the assessment and next move before writing anything, then records feedback as evidence, closes the completed turn, and grounds the next decision in that evidence. It does not change mastery state.

If that Evidence refutes an earlier frontier hypothesis, record the correction
without changing mastery:

```bash
python tools/runtime.py --repo . record frontier-revision frontier-revision.json
```

The revising Decision must already use the cited Evidence. Frontier revisions
are scoped workspace receipts; legacy v0.1 storage remains immutable.

Create a validated learner-operable representation:

```bash
python tools/runtime.py --repo . artifact examples/learning-artifacts/bayes-frequency-tree.json
```

The returned `artifact_ref` can be attached to a Decision representation. Artifacts live outside the receipt ledger and never update learner state.

The Workspace uses the companion `respond-context` command when a learner submits from an artifact. It preserves the committed prediction and final explored value on the Observation after validating them against the artifact. Agents receive this context through `pending`; they must still judge the learner's explanation rather than infer mastery from interaction telemetry.

## Manage Projects

Create the first or an additional Project from JSON:

```bash
printf '%s' '{"title":"Transformer","goal":"Implement and debug self-attention"}' \
  | python tools/learning.py create-project -
python tools/learning.py projects
python tools/learning.py brief
```

Selection and lifecycle changes are explicit:

```bash
python tools/learning.py switch-project transformer
python tools/learning.py pause-project transformer
python tools/learning.py resume-project transformer
python tools/learning.py archive-project transformer
python tools/learning.py maintenance-start transformer
python tools/learning.py maintenance-finish transformer retention_confirmed
```

Paused and archived Projects are read-only. Archive retains the complete local
Project. A maintenance study temporarily permits new scoped Runtime receipts;
finishing it returns the Project to read-only `scheduled` or `due` state.

`brief` is read-only and returns a compact JSON session orientation for an
Agent or UI. It prioritizes a pending learner response, a due archived review,
or the selected Project's current decision. It is deliberately not a repeated
product introduction or a dump of the full learner model.

## Complete a Mission from Evidence

Configure explicit Mission criteria, inspect their current Evidence status,
and perform the verified completion transition:

```bash
python tools/learning.py criteria-set completion-criteria.json
python tools/learning.py completion-status
python tools/learning.py complete-project
```

The gate requires Mission-local Runtime Evidence for both a Feynman
reconstruction and an independent performance capability, with distinct
receipts. Success writes an immutable `completion.json`, completes the Mission,
and archives the retained Project with maintenance scheduled. The existing
`archive-project` command remains an administrative transition and does not
claim that the gate passed. See
[`../docs/MISSION-COMPLETION.md`](../docs/MISSION-COMPLETION.md).

## Save reusable learning materials

The Learning Library stores deliberate, typed assets rather than automatic
conversation summaries:

```bash
python tools/learning.py material-save material.json
python tools/learning.py materials
```

Every material requires a return reason plus Runtime Evidence or source
provenance. Material records are immutable and cannot update learner state.
See [`../docs/LEARNING-LIBRARY.md`](../docs/LEARNING-LIBRARY.md).

## Revise the canonical LearningMap

Read the active Project's topology:

```bash
python tools/learning.py map
```

After project-local Evidence changes the topology hypothesis or frontier,
submit the full semantic map (nodes, edges, frontier, rationale, and Evidence
IDs):

```bash
python tools/learning.py map-update map-update.json
```

The write boundary validates scope and lifecycle, computes the delta, appends
an immutable revision, updates `map/current.json`, and regenerates
`map/ROADMAP.md`. It rejects mastery fields and pixel positions. See
[`../docs/LEARNING-MAP.md`](../docs/LEARNING-MAP.md).

## Start a real longitudinal arc

```bash
python tools/learning.py start-arc probability bayes-base-rate
```

Available domains:

```text
probability
mathematics
paper-reading
programming-agent
conceptual
```

The command initializes `.learning/` if necessary, then creates a dated directory under `.dogfooding/` containing:

```text
BRIEF.md
ARC.md
README.md
sessions/
└── 001.md
```

The files are copies of the public evaluation templates. Filled learner evidence remains local because `.dogfooding/` is Git-ignored by default.

Working names may contain Unicode, for example:

```bash
python tools/learning.py start-arc probability 贝叶斯直觉
```

## Add the next session

```bash
python tools/learning.py new-session 20260905-probability-bayes-base-rate
```

This creates the next numbered record (`002.md`, `003.md`, ...). Existing evidence is never replaced.

## Record vNext product dogfooding

After completing the corresponding `sessions/NNN.md` from a real learner session, create a product-surface checkpoint for the same numbered session:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc-name> --entry-mode workspace
```

Then edit only fields that were actually observed and validate the local records:

```bash
python tools/vnext_product_dogfood.py --repo . validate <arc-name>
python tools/vnext_product_dogfood.py --repo . summary <arc-name>
```

The records live under `.dogfooding/<arc-name>/product-observations/NNN.json`. They describe Entry, Today, DailyContext, Focus Session, the evidence-bearing turn, lifecycle behavior, and narrow/mobile behavior. Missing observations remain `not_observed` / `null` rather than becoming implicit passes.

This tool is evaluation-only: it never writes `.learning/`, cannot create Evidence or learner-state changes, and cannot emit a feature-promotion verdict. Use repeated real checkpoints plus [`../evaluation/PROMOTION.md`](../evaluation/PROMOTION.md) before promoting any product-level change. The former Capture Inbox hypothesis is not promoted and no longer appears in the canonical roadmap. See [`../evaluation/VNEXT-PRODUCT-DOGFOOD.md`](../evaluation/VNEXT-PRODUCT-DOGFOOD.md).

## Inspect local status

```bash
python tools/learning.py status
```

Shows whether `.learning/` exists and lists local arcs with their number of session records. It does not parse or print learner evidence.

## Check repository invariants

```bash
python tools/learning.py doctor
```

Checks that required templates, evaluation contracts, five domain briefs, and the `.learning/` / `.dogfooding/` privacy ignores are present.

## Tests

The runner uses only the Python standard library:

```bash
python -m unittest discover -s tests -p 'test_*.py'
python tools/learning.py doctor
python tools/runtime.py --repo . verify
```

GitHub Actions runs both checks on pushes and pull requests.

## Boundary

Keep these tools deliberately boring. New commands should remove repeated operational friction or enforce an important audit invariant, not move teaching policy into Python. `start-mission` stores explicit learner input and attaches only the fixed baseline probe described above. Learner-model inference, domain teaching, roadmap revision, and representation choice remain responsibilities of the Teach/Study protocol. The runtime may reject unsafe state transitions, but it never auto-promotes mastery.
