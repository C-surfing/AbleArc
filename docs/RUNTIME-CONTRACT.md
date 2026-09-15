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

Receipts are stored under `.learning/runtime/receipts/`. They are individual immutable JSON files so one agent cannot accidentally rewrite the evidence that justified an earlier conclusion. `.learning/runtime/state.json` is a small machine-operable projection of accepted concept-state decisions.

The existing Markdown files remain useful human projections. Agents should not infer that editing prose is equivalent to an accepted structured state transition.

## Observation is not evidence

An `Observation` records what happened: the learner's action and result. An `EvidenceReceipt` is an explicitly attributed interpretation of that observation. Keeping them separate means another assessor can disagree without changing history.

Raw transcript excerpts are optional. Prefer a minimal result description unless exact wording is necessary for diagnosis; learner data remains local and Git-ignored by default.

## State authority

Agents may create `StateProposal` receipts. They may not accept their own proposal merely because they produced it. Acceptance requires one of:

- `runtime_policy`: deterministic safety checks passed, followed by an explicit acceptance call;
- `learner`: an explicit learner edit or override;
- `human_reviewer`: a human assessment or override.

Policy overrides are allowed only for learner or human authority and are recorded with both the failed checks and the reason. This preserves flexibility without making exceptions invisible.

The initial policy is intentionally conservative:

- promotion cannot skip mastery states;
- promotion requires supporting evidence;
- downgrade requires contradicting evidence;
- `stable` requires at least two supporting, meaningfully independent, lightly scaffolded signals;
- `transferable` requires lightly scaffolded transfer in a novel context;
- stale proposals cannot overwrite a newer accepted state.

These are guardrails, not a complete theory of learning. Change them only after real longitudinal evidence reveals a repeated failure.

## CLI

Initialize the private runtime ledger:

```bash
python tools/runtime.py --repo . init
```

Record an object from a JSON file (or pass `-` to read stdin):

```bash
python tools/runtime.py --repo . record decision decision.json
python tools/runtime.py --repo . record observation observation.json
python tools/runtime.py --repo . record evidence evidence.json
python tools/runtime.py --repo . record state-proposal proposal.json
python tools/runtime.py --repo . record turn turn.json
```

Capture the normal learner response through the high-level façade:

```bash
python tools/runtime.py --repo . respond dec_example -
```

The response is read from stdin, inherits its concept IDs and expected action from the decision, and becomes one local observation. This is the same path used by the Workspace; the learner never supplies receipt metadata.

Read the next response awaiting assessment:

```bash
python tools/runtime.py --repo . pending
```

After interpreting it, an agent can atomically validate the next transition at the integration boundary:

```bash
python tools/runtime.py --repo . advance dec_example assessment.json
```

The compact payload contains an `assessment` using the EvidenceReceipt fields and a `next_decision` using the DecisionProposal fields. The runtime derives the observation and concept references, adds the new evidence to the next decision, closes the old turn, and returns all three receipts. Invalid next moves are rejected before feedback is persisted. This façade introduces no new receipt kind and never mutates mastery state.

Accept or reject a proposal:

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

The cross-agent JSON contract is published at [`../schemas/runtime-v0.1.json`](../schemas/runtime-v0.1.json). The CLI assigns IDs and timestamps when omitted.

## Integration rule

When `.learning/runtime/manifest.json` exists, Teach/Study agents should use the runtime for meaningful learning turns. Before asking the learner to repeat an answer, call `pending`. When it returns a response, assess it and prefer the high-level `advance` path for feedback plus the next move. Propose state changes separately, and only when evidence changes a future teaching decision.

A turn may end as `awaiting_evidence`. This is preferable to fabricating an observation or prematurely updating the learner model.
