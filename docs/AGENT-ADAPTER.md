# Agent Adapter

The official Workspace can complete one provider-backed learning loop without
making a model the source of learner truth:

```text
learner response
      ↓
local Observation receipt
      ↓
AgentAdapter structured assessment + one next move
      ↓
Runtime validation and validated advance
      ↓
Evidence + next Decision + Turn receipts
```

The adapter proposes an interpretation. `tools/runtime.py` remains the write
boundary: it revalidates the payload, preserves receipt scope, and does not
promote mastery as part of `advance`. Mastery changes still require the
separate proposal and authority path.

## Configuration

Copy `apps/workspace/.env.example` to `apps/workspace/.env.local`, then set:

```bash
AI4LEARNING_PROVIDER_API_KEY=...
AI4LEARNING_PROVIDER_MODEL=...
AI4LEARNING_PROVIDER_BASE_URL=https://api.openai.com/v1
AI4LEARNING_PROVIDER_TIMEOUT_MS=45000
```

Restart `npm run dev` after changing environment variables. The first adapter
calls `POST <base-url>/chat/completions` and requires support for strict JSON
Schema structured output. The default base URL is the OpenAI API. Another
compatible endpoint may be used when it implements the same request and
response contract. Remote endpoints must use HTTPS; plain HTTP is accepted
only for loopback development.

The API key is read only by server code. Do not prefix it with `NEXT_PUBLIC_`,
commit `.env.local`, put credentials in the base URL, or pass them through a
browser request.

## Turn contract

The adapter receives the selected Project's pending Mission, Decision,
learner Observation, and learner-state projection. It returns:

- one evidence assessment for the observed action;
- learner-visible result feedback;
- one reachable next cognitive move;
- the evidence that would support or falsify that move.

The model cannot return an assessor identity; the server injects
`provider:<adapter>:<model>`. Unknown fields, unsafe concept identifiers,
invalid enums, malformed JSON, refusals, timeouts, and stale Decision IDs are
rejected before a Runtime write.

Learner text is explicitly treated as untrusted content rather than
instructions. Strict structured output limits shape, but the Runtime remains
the authority boundary because schema validity is not the same as a sound
teaching judgment.

## Failure and retry

The learner response is saved locally before the Provider call. If the call
fails, it remains `awaiting_assessment`; the Workspace shows the error and can
retry the same Decision. A stale or already-advanced Decision receives a
conflict response rather than producing duplicate Evidence.

Without Provider configuration, the original headless flow still works:

```bash
python tools/runtime.py --repo . pending
python tools/runtime.py --repo . advance <decision-id> payload.json
```

## Current limits

- one OpenAI-compatible adapter;
- non-streaming assessment requests;
- no Provider-side tool calls;
- no automatic state proposal or mastery change;
- no cloud learner-data store.

Additional providers should implement `AgentAdapter.generateStructured`
without changing the Runtime contract or browser-facing API.
