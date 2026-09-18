# Host Integration Contract

Status: **v0.1 contract implemented; host mappings pending**

AbleArc should work inside the conversational product the learner already prefers. The first-party Web app remains important, but it is one host over the Learning Engine rather than the only natural interaction surface.

## 1. Host-neutral shape

```text
ChatGPT / other assistant / IDE / AbleArc Web
                  │
                  ▼
             Host Adapter
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 Conversation Plane   available host capabilities
        │
        ▼
      AbleArc Learning Engine
        │
        ├── control proposal / receipts
        └── presentation response
```

A host adapter is deliberately thin. It translates host message/attachment/tool conventions into an AbleArc turn envelope and translates AbleArc presentation output back into the host.

## 2. Input envelope

The v0.1 `HostTurnInput` is published in `schemas/host-turn-input-v0.1.json` and validated by `apps/workspace/lib/host-turn.ts`. It supports:

```text
host
conversation/session id
learner message
optional project/mission hint
optional reference items
optional explicit learner self-report
available capabilities
presentation constraints
```

Reference items should support at minimum:

- pasted text;
- file/document handle;
- URL/source handle;
- code/file handle;
- learner label such as “this is the textbook/slide I am following”.

Do not copy host credentials or opaque private metadata into Runtime receipts.

## 3. Output envelope

The response should be split:

```text
presentation
  natural_message
  optional representation
  optional citations/source references
  optional action affordance

control
  decision proposal
  assessment/evidence proposal when applicable
  state/map proposals when applicable
  trace metadata
```

A host may render only `presentation`. AbleArc still validates and persists `control` through the Runtime boundary.

## 4. ChatGPT and other assistant products

Do not build separate learning semantics for each product. Implement:

1. the host-neutral envelope;
2. one local reference adapter and conformance tests;
3. a ChatGPT/assistant connector mapping;
4. additional host mappings only when their capability model materially differs.

The integration should let a learner say, naturally:

```text
I am reading this PDF. I understand the forward pass but backprop still feels mechanical.
Use the notation from the PDF, and only test me where you are actually uncertain about my understanding.
```

The adapter should pass the document and self-report as context. AbleArc should not respond with a setup questionnaire or expose receipt bookkeeping.

## 5. Authority

Host conversation history, reactions, clicks, and assistant confidence are not learner mastery.

Only explicit Runtime authority paths can change canonical learner truth. Host adapters may cache operational state but cannot create a parallel state model.

## 6. Capability negotiation

The adapter should declare what the host can do for the current turn, for example:

```text
read_attachment
retrieve_web_source
execute_code
render_diagram
edit_file
```

The Teacher chooses a capability only when it has decision value. A programming-capable host is not expected to execute code on every programming question.

## 7. First implementation slice

The first slice now includes:

- a host-neutral TypeScript contract;
- a published JSON Schema for input validation;
- text message + reference metadata + self-report input;
- capability negotiation;
- separate `presentation` and `control` output types;
- no mastery writes from the adapter;
- contract tests.

The next slice is to map the existing Web composer onto this envelope and add one external-assistant fixture proving both hosts preserve identical Runtime semantics.

Streaming, rich generative UI, cloud sync, and broad attachment ingestion are later concerns.
