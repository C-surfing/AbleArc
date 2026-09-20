# Web Stabilization Gate — 2026-09-20

Status: **active product stabilization gate during K8**
Date: 2026-09-20
Tracking issue: #132

## Why this gate exists

K1–K7 of Learning Kernel v1 are complete. K8 longitudinal validation remains the active learning gate.

A real first-party Web retest on 2026-09-20 found that the Web Host is not yet reliable enough to use every failed session as evidence about Kernel pedagogy. The failures are concentrated in provider transport, Host recovery, projection correctness, and the missing Web path from Evidence into the existing state-proposal authority mechanism.

This is therefore a bounded **Web stabilization interrupt**, not a return to product-first development and not a reopening of Kernel semantics.

The rule is:

> Fix the validation instrument before interpreting its failures as learning-system failures.

## Observed evidence

The retest reported:

- 156 / 156 Python tests passing;
- 120 / 120 Web tests passing after adding projection regression fixtures;
- short structured assessment replay: 5 / 8 valid;
- longer real learner response replay: 1 / 5 valid;
- three long-response failures terminating at the current 45 second provider timeout;
- a real saved Focus response followed by two consecutive assessment failures;
- Web-generated Evidence with no corresponding StateProposal, leaving the accepted concept-state projection empty;
- an unfilled STATE.md template projected as learner-facing content and incorrectly normalized to transferable mastery;
- correct pause/resume enforcement and correct preservation of learner input across provider failure.

These measurements are indicative rather than an SLA. They are sufficient to establish structural product failures that must be repaired before Web dogfooding is treated as a clean Kernel signal.

## Architectural diagnosis

The canonical architecture remains:

```text
Host / Product
Web · Agent/Skill · assistant integrations
                │
                ▼
         Learning Kernel
Mission · Map · Model · Context · Policy
Move · Observation · Evidence · Pacing
                │
                ▼
      Learning Runtime authority
receipts · state proposals · accepted projection
                │
                ▼
       local learner workspace
```

The retest identifies four Host-side failure classes.

### 1. Provider reliability failure

```text
saved learner response
  → provider request
  → structured-output drift / timeout
  → assessment terminates
```

The repair belongs in the provider/Host integration boundary:
bounded retry, typed validation errors, token limits, timeout policy, and actionable diagnostics.

It does **not** belong in learner truth.

### 2. Interaction recovery failure

A learner response may be safely persisted while the assessment fails. The UI must represent that partial success explicitly:

```text
Observation saved
  + assessment failed
  = retry assessment of the same Observation
```

Retry state, progress indicators, latency, and error banners are Host operational state.

### 3. Authority-path incompleteness

The Agent path can participate in the full Runtime transaction, but the first-party Web path currently stops after Evidence:

```text
Observation
→ Evidence
→ [missing Web proposal step]
→ StateProposal
→ authority decision
→ accepted learner-model projection
```

The Web Host may generate a candidate proposal, but it may not directly write or silently accept mastery. Existing Runtime authority must remain the only accepted state-change path.

### 4. Projection-truth failure

Learner-facing projection code must never infer mastery from template text, prose substrings, internal IDs, or formatting artifacts.

Projection is presentation, not authority. It must fail closed when source state is empty or ambiguous.

## Stabilization workstreams

The active issue sequence is:

```text
W0  projection truthfulness                    #130
 ↓
W1  provider setup compatibility               #129
 ↓
W2  structured assessment reliability          #126
 ↓
W3  Focus recovery and pending-state UX        #127
 ↓
W4  Evidence → StateProposal authority path     #128
 ↓
W5  learner-language / local-dev hygiene        #131
 ↓
resume first-party Web K8 dogfooding
```

Umbrella: #132.

### W0 — Projection truthfulness

Adopt the retest-backed fixes for:

- horizontal-only field parsing;
- template placeholder rejection;
- exact mastery-state parsing;
- ROADMAP header-based parsing;
- projection fixture coverage;
- test-loader-compatible imports;
- removal of raw receipt/decision mechanics from normal learner UI.

This work is intentionally first because learner-facing false mastery damages trust even if Runtime authority itself was not corrupted.

### W1 — Provider setup validity

Model Setup must validate compatibility before the learner enters a real session.

A real learner response must not be the first provider connectivity or structured-output compatibility test.

### W2 — Assessment reliability

Add provider-neutral resilience:

- retryable vs non-retryable error classes;
- 1–2 bounded retries;
- prior validation error fed into the retry prompt;
- typed structured-output validation failures;
- bounded max_tokens in json_object mode;
- a reasoning-model-safe default timeout with explicit override;
- regression coverage for malformed, truncated, and misnested outputs.

Strict validation remains in place. Reliability must not be achieved by accepting malformed learner-truth payloads.

### W3 — Focus recovery

The UI must distinguish:

```text
response not saved
response saved, assessment pending
response saved, assessment failed
response saved, assessment succeeded
```

A saved response must be retryable without retyping. Reloading must not silently erase the actionable failure state.

### W4 — Complete the authority transaction

The Web path should support:

```text
learner action
→ Observation
→ Evidence
→ candidate StateProposal
→ existing authority decision
→ accepted state projection
```

No React component, provider response, or client-side heuristic may directly set mastery.

Evidence does not imply a state transition every turn. Uncertainty may remain uncertainty.

### W5 — Product polish after the loop is trustworthy

Only after the blocking learning loop is stable:

- unify learner-facing language;
- keep local dev startup from dirtying the repository;
- clean tool documentation and scripting ergonomics.

## K8 interpretation rule

During this gate:

- Agent-mode longitudinal sessions may still contribute real Kernel evidence;
- Web sessions may be used to reproduce and validate Host defects;
- a Web provider timeout, malformed structured response, or dead-end retry state must **not** be classified as a pedagogical Kernel failure;
- a genuine teaching failure observed after the Web transaction succeeds may still contribute to #2 / #95.

K8 therefore remains active, but its evidence must be classified by layer before it changes architecture.

## Exit criteria

The first-party Web Host is ready to resume normal K8 longitudinal dogfooding when:

1. Provider configuration is validated before learning starts.
2. A saved learner response survives provider failure and can be reassessed without duplicate Observation creation.
3. Retryable structured-output failures receive bounded automatic repair attempts.
4. Unknown failures are logged; known failures are categorized and actionable.
5. Empty/template state cannot create learner-facing mastery claims.
6. Web-produced Evidence can enter the canonical StateProposal / authority path without direct client mastery writes.
7. Normal learner-facing surfaces hide raw receipt and internal decision identifiers.
8. A real multi-turn Web session completes end-to-end without CLI repair or manual refresh.

## Explicit non-goals

This gate does not justify:

- a new Kernel abstraction;
- provider-specific learner-state fields;
- weakening Evidence/state authority;
- automatic mastery from conversation quality;
- a second Web learner model;
- Capture Inbox;
- a scheduler;
- notification infrastructure;
- timer semantics in Runtime;
- generic agent orchestration;
- unrelated visual redesign.

## Development rule after stabilization

When this gate closes, return to K8 longitudinal validation. Do not continue product expansion automatically.

The next architecture change should still require real evidence that the existing Kernel or Host boundary cannot express the needed behavior.
