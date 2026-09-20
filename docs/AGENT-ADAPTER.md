# Agent Adapter

The official AbleArc Workspace can complete one provider-backed learning loop without
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

The Web product uses a **bring-your-own-model (BYOM)** configuration. The
learner/operator supplies the server-side API key, model ID, endpoint, and the
structured-output mode required by that endpoint. AbleArc does not require the
same Provider as an external Agent using the Teach/Study skills.

Copy `apps/workspace/.env.example` to `apps/workspace/.env.local`, then set:

```bash
ABLEARC_PROVIDER_API_KEY=...
ABLEARC_PROVIDER_MODEL=...
ABLEARC_PROVIDER_BASE_URL=https://api.openai.com/v1
ABLEARC_PROVIDER_STRUCTURED_OUTPUT=json_schema
ABLEARC_PROVIDER_TIMEOUT_MS=120000
```

`ABLEARC_PROVIDER_STRUCTURED_OUTPUT` accepts:

- `json_schema` — default; sends strict JSON Schema `response_format` to
  `/chat/completions`;
- `json_object` — asks the Provider for valid JSON and supplies AbleArc's
  trusted JSON Schema in the system instruction. The returned object is still
  parsed and strictly validated by AbleArc before the Runtime may advance.

The previous `AI4LEARNING_PROVIDER_*` names remain accepted as compatibility
aliases during the AbleArc migration. When both forms are present, the
`ABLEARC_PROVIDER_*` value wins.

Restart `npm run dev` after changing environment variables. The current adapter
calls `POST <base-url>/chat/completions`. Remote endpoints must use HTTPS; plain
HTTP is accepted only for loopback development.

### DeepSeek example

DeepSeek's OpenAI-format Chat Completions endpoint supports JSON Object output.
For the current DeepSeek API, a local pilot can use:

```bash
ABLEARC_PROVIDER_API_KEY=<your DeepSeek API key>
ABLEARC_PROVIDER_MODEL=deepseek-flash
ABLEARC_PROVIDER_BASE_URL=https://api.deepseek.com
ABLEARC_PROVIDER_STRUCTURED_OUTPUT=json_object
ABLEARC_PROVIDER_TIMEOUT_MS=120000
```

This does **not** make DeepSeek authoritative for learner state. DeepSeek returns
an assessment/next-move proposal; AbleArc validates the exact object shape,
concept identifiers, enums, lifecycle state, stale Decision protection, and the
Runtime write before accepting the turn.

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
instructions. Structured output limits shape, but the Runtime remains the
authority boundary because JSON/schema validity is not the same as a sound
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

This is also why an external Agent using AbleArc as a skill does not need the
Workspace Provider configuration: that Agent is already supplying the model
and can operate through the same Runtime boundary.

## Current limits

- one OpenAI-compatible Chat Completions adapter with two structured-output modes;
- non-streaming assessment requests;
- no Provider-side tool calls;
- no automatic state proposal or mastery change;
- no cloud learner-data store;
- no learner-facing Web settings screen for Provider credentials yet; the
  current pilot uses server-local `.env.local` configuration.

Additional providers should implement `AgentAdapter.generateStructured`
without changing the Runtime contract or browser-facing API.


## Web graphical configuration

The first-party Web no longer requires a learner to edit `.env.local` to select a model.

When no effective Provider exists, `/` renders Model Setup before Entry. The same form remains available at:

```text
/settings
```

Web configuration is persisted server-side under:

```text
.learning/provider-settings.json
```

The file is Git-ignored with the rest of local learner/runtime state and is written with restrictive file permissions where the platform supports them. The browser never receives the saved API key after submission.

Resolution order is:

```text
explicit ABLEARC_PROVIDER_* / legacy environment credentials
        ↓
Web-saved local Provider settings
        ↓
not configured
```

Environment configuration therefore remains useful for deployments and automated environments, but it is no longer the normal learner onboarding path.

The Web settings UI currently targets OpenAI-compatible Chat Completions transports. It provides OpenAI-compatible and DeepSeek-compatible presets plus a custom endpoint option. Provider transport remains outside Runtime learner-truth authority.
