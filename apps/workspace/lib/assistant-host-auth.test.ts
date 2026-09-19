import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAssistantHostRequest } from "./assistant-host-auth.ts";

function request(
  headers: Record<string, string>,
  host = "ablearc.local",
) {
  return {
    headers: new Headers(headers),
    nextUrl: { host },
  };
}

test("assistant host accepts explicit same-origin browser requests", () => {
  assert.equal(authorizeAssistantHostRequest(
    request({ origin: "https://ablearc.local", host: "ablearc.local" }),
    undefined,
  ), true);
});

test("assistant host does not treat missing Origin as trusted", () => {
  assert.equal(authorizeAssistantHostRequest(
    request({ host: "ablearc.local" }),
    undefined,
  ), false);
});

test("assistant host accepts a matching bearer token for external hosts", () => {
  assert.equal(authorizeAssistantHostRequest(
    request({ authorization: "Bearer external-secret" }),
    "external-secret",
  ), true);
  assert.equal(authorizeAssistantHostRequest(
    request({ authorization: "Bearer wrong-secret" }),
    "external-secret",
  ), false);
  assert.equal(authorizeAssistantHostRequest(
    request({ authorization: "Basic external-secret" }),
    "external-secret",
  ), false);
});
