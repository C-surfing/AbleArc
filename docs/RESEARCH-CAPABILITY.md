# Research Capability v1

Status: **first bounded capability slice**

Research is a specialist workflow invoked by the Teacher when a material source uncertainty would change a teaching decision. It is not a second teacher, a generic research agent, or a learner-state authority.

## Boundary

```text
Teacher selects learning move
        ↓
material source uncertainty matters
        ↓
Research Capability
        ↓
findings + provenance + conflicts + uncertainty
        ↓
Teacher synthesizes for learner
        ↓
normal learner interaction / Runtime path
```

Research may inform teaching or later explicit LearningMaterial creation. Research output itself is **not learner Evidence**.

Research cannot directly create:

- Observation;
- EvidenceReceipt;
- StateProposal / StateDecision;
- accepted LearningMap revision;
- Mission completion.

## First modes

The v0.1 contract intentionally supports only:

- `verify_claim` — check whether supplied source material supports a concrete claim;
- `clarify_source` — resolve what supplied source text actually says;
- `compare_sources` — compare resolved supplied sources and surface disagreement.

This is intentionally not a generic capability framework.

## Input

Research is built on the same host-neutral references already used by Paper Learning.

A `ResearchInvocation` contains:

- Project / Mission scope;
- one explicit pedagogical purpose;
- one bounded query;
- optional claim for claim verification;
- HostTurn references;
- available host capabilities.

The purpose matters. "A research tool exists" is not sufficient reason to call it.

## Source resolution

The first slice does not fetch arbitrary sources itself.

```text
resolved HostReference excerpt
→ Research can use it

opaque file locator
→ needs_host_action: read_attachment

opaque URL locator
→ needs_host_action: retrieve_source
```

This lets Web, ChatGPT/assistant hosts, IDEs, and future connectors use the same Research contract while keeping credentials and host-specific retrieval outside AbleArc's learning core.

If only opaque references are present, Research does not require a configured model Provider; it returns the required host action first.

## Output

A completed Research result contains:

- concise source-grounded summary;
- findings;
- cited source reference IDs;
- per-finding relation: supports / contradicts / unclear;
- source conflicts;
- explicit uncertainty;
- a compact `teacherUse` note describing how the result can inform the selected teaching move.

The result is for the Teacher to synthesize. It is not a learner-facing response by itself.

Provider output that cites a source ID not present in the resolved input is rejected.

## Local audit

Research writes an immutable Project-local operational audit under:

```text
.learning/projects/<project-id>/capabilities/research/invocations/
```

The audit keeps enough metadata to debug capability use:

- invocation id;
- Project / Mission;
- purpose and mode;
- bounded query / optional claim;
- source reference IDs and labels;
- result status;
- cited / unresolved references;
- requested host capability;
- warnings;
- concise output summary.

**Source excerpt bodies are deliberately not copied into the audit record.**

The audit is operational capability state. It is not part of Runtime learner truth.

## First-party route

The first-party server exposes:

```text
POST /api/capabilities/research
```

The route:

1. validates a HostTurn;
2. verifies selected Project / Mission scope;
3. creates a typed Research invocation;
4. asks the host to resolve opaque references when necessary;
5. otherwise invokes the configured Provider with strict structured output;
6. writes the minimized local audit;
7. returns the capability result.

No Runtime command is invoked by this route.

## No RAG in v1

Research v1 intentionally does **not** add:

- embeddings;
- vector databases;
- ingestion queues;
- persistent paper corpus indexing;
- rerankers;
- agent swarms;
- a generic plugin framework.

Those are separate hypotheses that require observed retrieval problems.

## Teacher integration

Use Research only when source verification can materially change what is taught, how confidently it is stated, or which comparison/limitation should be surfaced.

Examples:

- "Does the paper actually attribute the gain to X?"
- "Do these two supplied excerpts disagree?"
- "Does the source define this term the way the learner is using it?"
- "Which reported result supports this claim, and what remains untested?"

Do not invoke Research merely because the topic is a paper or because source tools are available.


## External assistant access

The Research route accepts either same-origin Web requests or the same bearer token used by the thin assistant host:

```http
Authorization: Bearer <ABLEARC_HOST_TOKEN>
```

This does not move Research into the host adapter. Research remains a bounded capability with its own request contract and audit record; the shared token only provides transport authorization.
