# Assistant Host v0.1

Status: **thin external-host slice**

This contract exposes the existing AbleArc learning system to ChatGPT-style assistants and other conversational hosts without creating host-specific learning semantics.

## Shape

```text
ChatGPT / assistant / IDE / other host
            ↓
thin transport mapping
            ↓
POST /api/host/learning
            ↓
Project lifecycle + HostTurn + learner-state read model
            ↓
Teacher / Runtime remain canonical
```

The host adapter does not implement mastery, Evidence policy, LearningMap logic, or Teacher policy.

## Authentication

Browser requests from the same AbleArc origin are accepted.

External hosts must send:

```http
Authorization: Bearer <ABLEARC_HOST_TOKEN>
```

and the local/hosted AbleArc server must configure:

```text
ABLEARC_HOST_TOKEN=...
```

A missing `Origin` is **not** considered trusted for this endpoint. This differs from ordinary same-origin browser routes because external assistant calls commonly omit browser Origin headers.

Do not expose this endpoint publicly without a strong token and normal transport security.

## Operations

### get_learning_state

Returns a bounded learner-facing state projection:

- selected Project / Mission;
- current frontier and state;
- next useful action;
- current turn target/move;
- learner-readable map nodes;
- review candidates;
- recent evidence summaries.

It deliberately does not expose Runtime receipt IDs, falsification bookkeeping, state-proposal mechanics, or raw learner notes.

### provide_learning_context

Accepts the existing `HostTurnInput` envelope and returns a normalized turn-scoped context.

It carries:

- the current message;
- explicit self-report;
- reference IDs / labels / locators / media types;
- whether each reference is already resolved;
- host capabilities.

It does **not** copy source excerpt bodies into the returned context and does not persist the message as a transcript.

```text
persistence: host_turn_only
```

Durable learner-profile persistence belongs to Learner Profile v1 (#98), not the transport adapter.

### start_or_continue_learning

If a selected Project already exists, returns that Project's current learning state.

If `projectId` names another existing non-archived Project, AbleArc switches through the canonical Project lifecycle command and then returns its state.

If no Project exists, the host may supply `goal`, optional `title`, `why`, and optional `newProjectId`; AbleArc delegates creation to `tools/learning.py create-project`, which also creates the normal Mission entry Decision.

An optional HostTurn can accompany the operation as current turn context. It is validated against the selected Project/Mission but is not transcript-persisted by the host adapter.

## Data ownership

The external host may retain its own complete conversation history.

AbleArc persists learning truth only through existing systems:

- learner actions / Evidence through Runtime;
- Project / Mission state through Project lifecycle;
- LearningMaterial through explicit material curation;
- later durable learner context through Learner Profile.

The assistant adapter does not mirror a host transcript into `.learning/`.

## ChatGPT / assistant mapping

A connector/action only needs to map its native message and attachment conventions into:

- `HostTurnInput`;
- one of the three assistant operations;
- existing Paper Learning / Research endpoints when those specialized capabilities are requested.

Example flow:

```text
user: "continue the paper from yesterday"
→ start_or_continue_learning
→ host renders current frontier + learner action

user supplies a PDF / self-report
→ provide_learning_context
→ host resolves attachment if needed
→ Paper Learning or Research may consume the same HostTurn

learner asks where they are
→ get_learning_state
```

No connector-specific mastery state is permitted.

## Published contract

- `schemas/assistant-host-operation-v0.1.json`
- `schemas/host-turn-input-v0.1.json`
- `apps/workspace/lib/assistant-host.ts`
- `apps/workspace/app/api/host/learning/route.ts`

A deployment-specific OpenAPI/action descriptor may wrap this endpoint later without changing learning semantics.
