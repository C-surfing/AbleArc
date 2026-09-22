# AbleArc ChatGPT Plugin v0.1

Status: **headless local MVP**

Issue: #176

## Architecture

```text
ChatGPT
  │
  ├─ AbleArc Skill
  │    teaching workflow / pedagogy
  │
  └─ AbleArc MCP
       controlled learning operations
          │
          ▼
     Learning Kernel
          │
          ▼
       Runtime
```

ChatGPT is the Teacher. AbleArc does not call a second Provider model on this path.

The plugin has no custom UI.

## Why Skill + MCP

The Skill answers:

- when to inspect learner state;
- when to explain versus probe;
- how to diagnose failure;
- when a message counts as a learner action;
- how to assess Evidence;
- how to choose one next cognitive move.

The MCP server answers:

- what persistent learning state exists;
- which Project/Mission is selected;
- how to create/switch a Project;
- how to record one learner Observation;
- how to commit one validated Evidence-grounded turn.

The Runtime remains authoritative for learner truth.

## MCP tools

### inspect_learning

Read-only.

Returns a bounded projection:

- selected Project / Mission;
- current frontier;
- current Decision ID and learner action;
- recent decisive Evidence;
- review candidates;
- a compact map slice;
- durable learner-profile context.

Internal IDs are for model tool chaining, not learner-facing prose.

### start_or_resume_learning

Write operation.

Can:

- resume the selected Project;
- switch to a specified Project;
- create a new Project when `createNew=true` or no Project exists.

It delegates to the canonical Project lifecycle commands.

### record_learner_action

Write operation.

Requires:

- the current Decision ID;
- the exact learner response;
- explicit `confirmsResponseMatchesCurrentMove=true`.

It writes an Observation only.

It does not create Evidence or mastery.

### commit_learning_turn

Write operation.

Takes ChatGPT's structured:

- teaching-policy interpretation;
- Evidence assessment;
- exactly one next Decision.

The server injects the assessor identity as `host:chatgpt-plugin`, validates the complete structure, and commits through the existing Runtime.

This path does **not** use `AgentAdapter.generateStructured`.

## Local server

Requirements:

- Node.js 22+
- Python 3.11+
- AbleArc repository checkout

Start the MCP server:

```bash
cd apps/mcp
npm install
npm run dev
```

Default endpoint:

```text
http://127.0.0.1:8787/mcp
```

Optional environment variables:

```text
ABLEARC_REPO_ROOT=/absolute/path/to/AbleArc
ABLEARC_MCP_HOST=127.0.0.1
ABLEARC_MCP_PORT=8787
AI4LEARNING_PYTHON=python
```

The default loopback bind is intentional.

## Test with MCP Inspector

Run the MCP server, then:

```bash
npx @modelcontextprotocol/inspector
```

Choose **Streamable HTTP** and connect to:

```text
http://127.0.0.1:8787/mcp
```

Verify:

1. initialization succeeds;
2. exactly four AbleArc tools are visible;
3. `inspect_learning` is read-only;
4. invalid IDs/inputs are rejected;
5. learner action recording requires explicit attribution confirmation;
6. committing a turn does not invoke an external Provider.

## Connect privately to ChatGPT

For local/private dogfooding, prefer OpenAI Secure MCP Tunnel instead of exposing the machine publicly.

High-level flow:

1. Create an MCP tunnel in OpenAI Platform tunnel settings.
2. Obtain the `tunnel_id` and a runtime API key.
3. Configure `tunnel-client` to forward to:
   `http://127.0.0.1:8787/mcp`.
4. Run `tunnel-client doctor --profile <profile> --explain`.
5. Keep `tunnel-client run --profile <profile>` active.
6. In ChatGPT developer mode, create a plugin/app connection using that tunnel.
7. Copy the resulting `plugin_asdk_app...` technical ID.
8. Use ChatGPT's `@plugin-creator` to create a local marketplace mapping for `plugins/ablearc` plus the registered MCP connection.

The registered connection ID is environment-specific and should not be committed to this repository.

## Package

Portable plugin metadata lives in:

```text
plugins/ablearc/plugin.json
```

The workflow Skill lives in:

```text
plugins/ablearc/skills/ablearc-learn/
```

A portable `mcp.json` is deliberately deferred until AbleArc has a stable public HTTPS MCP endpoint. Secure MCP Tunnel is a private development transport, not a public plugin distribution endpoint.

## First dogfood scenarios

Run these with a real learner; do not fabricate successful Evidence.

### Resume

```text
Continue the Agent memory topic from last time.
```

Expected:

- inspect current state;
- resume at actual frontier;
- do not replay a generic introduction.

### Direct knowledge question

```text
Why does CUDA shared memory sometimes help if L1 cache already exists?
```

Expected:

- answer the genuine question;
- only probe if the answer can change the next teaching move;
- do not manufacture an Evidence cycle merely because the plugin is active.

### Learner action

After AbleArc has asked for one specific explanation/prediction/application:

```text
I think the reuse is the key: loading once into shared memory amortizes the global-memory traffic across several accesses, but synchronization can erase the gain.
```

Expected:

- verify the message answers the current learner action;
- record Observation;
- assess;
- commit exactly one next move;
- give natural feedback without exposing protocol enums.

### Delayed retrieval

On a later session:

```text
Continue CUDA.
```

Expected:

- inspect old Evidence;
- prefer retrieval before refresh when useful;
- do not lower mastery merely because time passed.

## Non-goals for v0.1

- custom ChatGPT UI;
- public plugin directory submission;
- cloud learner database;
- another Provider/LLM hop;
- generic transcript memory;
- broad RAG/vector infrastructure;
- exposing raw Runtime commands;
- notifications;
- gamification.

The immediate goal is real K8 longitudinal learning through ChatGPT.
