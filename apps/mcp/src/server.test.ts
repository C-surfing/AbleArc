import assert from "node:assert/strict";
import test from "node:test";
import { createAbleArcMcpServer, createHttpApp } from "./server.ts";

test("headless MCP server can be constructed without starting a listener", () => {
  const server = createAbleArcMcpServer();
  assert.ok(server);
});

test("HTTP app exposes a listen-capable Express application", () => {
  const app = createHttpApp();
  assert.equal(typeof app.listen, "function");
});
