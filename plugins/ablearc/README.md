# AbleArc ChatGPT Plugin

This directory is the portable, headless AbleArc plugin package.

Current shape:

```text
plugin.json
└── skills/
    └── ablearc-learn/
        ├── SKILL.md
        └── references/
```

The MCP server lives separately at `apps/mcp`.

There is intentionally **no custom UI**.

During local development, the MCP connection is registered in ChatGPT developer mode and attached to the plugin as an environment-specific app/MCP mapping. That mapping is not committed because its `plugin_asdk_app...` identifier belongs to the developer's ChatGPT workspace.

A public `mcp.json` will be added only when AbleArc has a stable public HTTPS MCP endpoint. For private dogfooding, use OpenAI Secure MCP Tunnel.
