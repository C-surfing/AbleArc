# Structured Learning Runtime Contract

The runtime turns `MAP → MODEL → MOVE → EVIDENCE` from hidden agent reasoning into an inspectable local transaction chain. It is a small contract between agents and learning surfaces, not a deterministic tutor or a psychometric model.

## Boundary

The LLM still proposes the teaching decision and interprets rich learner behavior. The runtime does four narrower jobs:

1. require the decision to name its target, rationale, learner action, expected evidence, and falsification signal;
2. keep observation separate from inference;
3. require evidence-linked state proposals and explicit acceptance authority;
4. preserve an immutable receipt chain that a Workspace or another agent can inspect.

It does not calculate a mastery probability, select the next move, or silently infer durable learner traits.

## Transaction chain

```text
accepted state + prior evidence
             ↓
      DecisionProposal
             ↓
   representation / artifact
             ↓
       learner action
             ↓
        Observation
             ↓
      EvidenceReceipt
             ↓
       StateProposal
             ↓
 explicit authority decision
             ↓
 accepted state projection
            ↓
        TurnReceipt
```

The receipt graph is an internal audit model. Learner-facing surfaces should use high-level actions and never require users to construct or understand these objects.

In a legacy workspace, v0.1 receipts remain under
`.learning/runtime/receipts/`. After migration, that immutable history is copied
under `.learning/projects/<project-id>/runtime/receipts/` without adding fields.
Every newly recorded receipt in workspace-v0.2 storage uses schema v0.2 and
contains runtime-assigned `workspace_id`, `project_id`, and `mission_id`.

The ledger may therefore be mixed-version by design. A v0.2 receipt may use an
imported v0.1 receipt as a compatibility input because its containing Project
was established by the migration. New v0.2 references must remain in the same
Project, and observation → evidence → turn chains must also remain in one
Mission. Project-level decisions and state proposals may explicitly cite older
Mission evidence from the same Project. A receipt whose Workspace or Project
does not match its physical storage is rejected. This implements the boundary
required before cross-Project weak priors: historical evidence can later inform
a probe, but it cannot be inserted directly into another Project's accepted
chain.

Receipts are individual immutable JSON files so one agent cannot accidentally
rewrite the evidence that justified an earlier conclusion. The neighboring
v0.1 `state.json` remains a rebuildable machine projection rather than an
immutable receipt; its version is intentionally independent of receipt scope.

The existing Markdown files remain useful human projections. Agents should not infer that editing prose is equivalent to an accepted structured state transition.

## Observation is not evidence

An `Observation` records what happened: the learner's action and result. An `EvidenceReceipt` is an explicitly attributed interpretation of that observation. Keeping them separate means another assessor can disagree without changing history.

Raw transcript excerpts are optional. Prefer a minimal result description unless exact wording is necessary for diagnosis; learner data remains local and Git-ignored by default.

## Failure diagnosis is not mastery

Workspace-v0.2 Evidence records a `failure_mode` so a negative result can distinguish
different causes that require different teaching responses:

- `none`: no diagnosed failure;
- `slip`: a local execution/attention mistake despite an otherwise usable model;
- `missing_prerequisite`: an upstream concept or representation is absent;
- `vocabulary_confusion`: terminology or symbol meaning is the blocker;
- `local_procedural_gap`: one step of an otherwise appropriate procedure is missing;
- `wrong_causal_model`: the learner's generative explanation predicts the wrong mechanism;
- `overgeneralization`: a valid rule is applied outside the structure where it is valid;
- `failed_transfer`: a known idea is not carried into a new context where the same structure does apply.

Supporting Evidence must use `failure_mode=none`. Contradicting Evidence must name
a specific failure mode. Inconclusive Evidence may use `none` when the cause is
not yet known, or a specific mode when the observed failure is clear but its
implication for the learner-state claim remains uncertain.

The field is diagnostic metadata for the next teaching decision. It does not
promote, downgrade, or otherwise mutate mastery by itself. Legacy v0.1 receipts
remain unchanged.

## Evidence artifact form

Workspace-v0.2 Evidence also records `artifact_form`: `prose`, `pseudocode`,
`code`, `executed_code`, or `diagram`. This describes what the learner
actually produced, not the form requested by the Decision. A prose description
of an algorithm remains `prose` even when the learner was asked to write code.

`executed_code` requires concrete execution evidence in the observation or
assessment context; a code block by itself is `code`. Artifact form is another
Evidence dimension, not a mastery state. Completion criteria may later require
specific forms when the Mission capability itself is form-sensitive.

## Frontier hypothesis revision

Mastery state and the Teacher's frontier hypothesis are different objects. A
new observation may reveal that the learner's actual frontier is below, above,
or differently scoped from the earlier hypothesis without proving any mastery
regression.

In workspace-v0.2 storage, a `frontier-revision` receipt records that
correction without mutating either Decision:

```text
superseded Decision
        +
revision Evidence
        +
revising Decision
        ↓
FrontierRevision
```

The receipt snapshots the previous and revised hypotheses and classifies the
reason as `prerequisite_discovered`, `hypothesis_refuted`, or `scope_refined`.
Its Evidence must already be used by the revising Decision. This makes “the
Teacher's earlier model was wrong” auditable while leaving mastery unchanged.

## State authority

Agents may create `StateProposal` receipts. They may not accept their own proposal merely because they produced it. Acceptance requires one of:

- `runtime_policy`: deterministic policy acceptance for explicitly eligible low-risk transitions, or an explicit trusted acceptance call;
- `learner`: an explicit learner edit or override;
- `human_reviewer`: a human assessment or override.

Policy overrides are allowed only for learner or human authority and are recorded with both the failed checks and the reason. This preserves flexibility without making exceptions invisible.

The initial policy is intentionally conservative. It also classifies transition risk:

- **low**: only `unknown → exposed`, when current state still matches and no policy issue exists; the Workspace may request Runtime reconciliation and `runtime_policy:low-risk-v0.1` may accept it automatically;
- **medium**: non-stable/non-transferable changes that pass policy but make a stronger learner-state claim, such as `exposed → developing`; explicit learner/human authority remains required;
- **high**: stable/transferable claims, downgrades, skipped states, or any policy-blocked acceptance; these are never auto-accepted.

The underlying safety rules remain:

- promotion cannot skip mastery states;
- `unknown → exposed` records first contact and may use supporting,
  contradicting, or inconclusive evidence;
- promotion beyond `exposed` requires supporting evidence;
- downgrade requires contradicting evidence;
- `stable` requires at least two supporting, meaningfully independent, lightly scaffolded signals;
- `transferable` requires lightly scaffolded transfer in a novel context;
- stale proposals cannot overwrite a newer accepted state.

These are guardrails, not a complete theory of learning. Change them only after real longitudinal evidence reveals a repeated failure.

A policy-blocked acceptance is itself part of the audit trail. Runtime persists an
immutable `state-decision` with `decision=rejected`, the attempted authority and
reason, and the complete `policy_issues`, then still returns a failure to the
caller. The rejected proposal is no longer pending and cannot later be rewritten
as accepted. If the learner or a human reviewer intentionally wants to override
the conservative policy, create a fresh state proposal and accept that new
proposal with the explicit override path. Rejections never advance the learner
state projection.

`exposed` is deliberately not a mastery claim. It means the learner has
encountered the concept through an evidence-bearing attempt. A failed or
ambiguous first attempt is therefore allowed to move `unknown → exposed`: the
Runtime preserves what happened without pretending the learner demonstrated
usable understanding. Contradicting or inconclusive evidence still cannot move
the concept to `developing`, `stable`, or `transferable`.

## CLI

Initialize the private runtime ledger:

```bash
python tools/runtime.py --repo . init
```

Create the first action for a learner-explicit Mission that has no Decision yet:

```bash
python tools/runtime.py --repo . bootstrap-mission
```

This is a fixed onboarding policy, not domain teaching. It creates one high-uncertainty `mission-entry` probe asking for a representative attempt. It records no evidence, roadmap, misconception, or mastery. A Teach agent should treat the response as orientation evidence, then use it to locate real concept IDs and choose the first domain-specific move; it should not promote domain mastery from this generic sample.

Record an object from a JSON file (or pass `-` to read stdin):

```bash
python tools/runtime.py --repo . record decision decision.json
python tools/runtime.py --repo . record observation observation.json
python tools/runtime.py --repo . record evidence evidence.json
python tools/runtime.py --repo . record frontier-revision frontier-revision.json
python tools/runtime.py --repo . record state-proposal proposal.json
python tools/runtime.py --repo . record turn turn.json
```

For the free-text Agent entry, inspect unanswered Decisions and explicitly
confirm response attribution:

```bash
python tools/runtime.py --repo . open-decisions
python tools/runtime.py --repo . respond dec_example - --confirm-attribution
```

`open-decisions` exposes the current Mission's Decisions that still lack a
learner response, including their `learner_action` and concept IDs. Runtime does
not try to guess semantic similarity between arbitrary natural-language answers
and tasks. Instead, the Agent must confirm that the learner's latest message is
actually a response to the selected Decision before `respond` will write an
Observation. A missing confirmation fails without writing anything.

The Workspace is different: its composer is already bound to the currently
rendered structured Decision and therefore continues to use `respond-context`
without this Agent confirmation flag.

If the learner has already acted on a move that the Agent failed to record,
do **not** attach that response to an unrelated open Decision and do not hide
the ordering error in `rationale`. Recover the intended Decision explicitly:

```bash
python tools/runtime.py --repo . recover-decision late-decision.json \
  --reason "The move was presented before its Decision was committed."
python tools/runtime.py --repo . respond <recovered-decision-id> - --confirm-attribution
```

The recovered workspace-v0.2 Decision is marked
`recorded_after_action=true` and carries an immutable `late_record_reason`.
Those fields are assigned only by the recovery path; normal Decision recording
and `advance` cannot set them. Recovery preserves the evidence chain while
making the protocol violation visible to audit and verification.

For a typed interactive artifact, the Workspace uses `respond-context`. Its JSON payload contains the response plus the learner's prediction and explored parameter range. The runtime checks that the artifact belongs to the Decision, the prediction is one of its declared options, and the values are inside its semantic range before adding `artifact_interaction` to the Observation. Interaction context informs assessment but is not automatically Evidence.

Read the next response awaiting assessment:

```bash
python tools/runtime.py --repo . pending
```

The returned handoff includes the Decision, Observation, accepted learner-state projection, and minimal explicit Mission context (`goal`, optional `why`, and source). This lets an adapter ground the first assessment without making the learner repeat their goal or treating the Mission as evidence.

After interpreting it, an agent can atomically validate the next transition at the integration boundary:

```bash
python tools/runtime.py --repo . advance dec_example assessment.json
```

The compact payload contains an `assessment` using the EvidenceReceipt fields and a `next_decision` using the DecisionProposal fields. The runtime derives the observation and concept references, adds the new evidence to the next decision, closes the old turn, and returns all three receipts. Invalid next moves are rejected before feedback is persisted. This façade introduces no new receipt kind and never mutates mastery state.

Inspect/reconcile learner-facing proposal policy:

```bash
python tools/state_proposals.py --repo . list
python tools/state_proposals.py --repo . reconcile
```

`reconcile` can accept only Runtime-classified low-risk first-exposure proposals. It cannot accept developing/stable/transferable claims, downgrades, stale proposals, or anything with policy issues.

Accept or reject a proposal explicitly:

```bash
python tools/runtime.py --repo . decide \
  sp_example accepted runtime_policy conservative-v0.1 \
  "Two independent evidence receipts satisfy the stable-state guardrail."
```

Inspect or verify the current ledger:

```bash
python tools/runtime.py --repo . state
python tools/runtime.py --repo . verify
```

The contracts are published at
[`../schemas/runtime-v0.1.json`](../schemas/runtime-v0.1.json) for immutable
legacy receipts and [`../schemas/runtime-v0.2.json`](../schemas/runtime-v0.2.json)
for scoped receipts. The CLI assigns IDs, timestamps, and v0.2 scope fields;
callers cannot select a different Workspace, Project, or Mission by editing a
payload.

## Integration rule

When `.learning/runtime/manifest.json` exists, Teach/Study agents should use the runtime for meaningful learning turns. If a learner-explicit Mission has no Decision, call `bootstrap-mission`. Before asking the learner to repeat an answer, call `pending`. When it returns a response, assess it and prefer the high-level `advance` path for feedback plus the next move. Replace the generic `mission-entry` concept with evidence-grounded domain concepts in that next Decision. Propose state changes separately, and only when evidence changes a future teaching decision.

When new Evidence materially refutes the prior Decision's
`frontier_hypothesis`, issue the corrected next Decision first and then record a
`frontier-revision` linking the two Decisions and the decisive Evidence. Do not
encode a Teacher hypothesis correction as mastery regression.

A turn may end as `awaiting_evidence`. This is preferable to fabricating an observation or prematurely updating the learner model.
