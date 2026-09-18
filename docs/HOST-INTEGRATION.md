# Host Integration Contract

Status: **v0.1 host contract implemented; thin plugin/Capability mapping active**

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

## 4. ChatGPT, plugins/connectors, and other assistant products

Plugins/connectors are a required AbleArc product surface. They are not removed in the name of architectural simplicity. The simplicity target is the internal implementation: every plugin should be a thin adapter over the same `HostTurnInput`, Capability, Teacher, and Runtime contracts.

Do not build separate learning semantics for each product. Implement:

1. the host-neutral envelope;
2. thin plugin/connector mappings into that envelope;
3. capability negotiation such as `retrieve_source`, `read_attachment`, or `execute_code`;
4. the shared AbleArc Capability boundary;
5. additional host-specific behavior only when the host capability model materially differs.

A ChatGPT or other assistant plugin may retrieve a source using host-native tools, then pass the retrieved excerpt plus provenance into Research Capability. The plugin does not create its own learner model, Evidence semantics, or teaching policy.

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
retrieve_source
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

Phase 8 adds the first concrete mapping: retrieved host references can be converted into the same Research Capability request used by the first-party server path. The remaining product work is packaging concrete ChatGPT/assistant connectors around this thin adapter and adding host-specific conformance fixtures, without duplicating learning semantics.

Streaming, rich generative UI, cloud sync, and broad attachment ingestion are later concerns.
