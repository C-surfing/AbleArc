import assert from "node:assert/strict";
import test from "node:test";
import { sameOrigin } from "./server-request.ts";

function request(origin?: string, host = "learn.local", forwardedHost?: string) {
  const headers = new Headers({ host });
  if (origin) headers.set("origin", origin);
  if (forwardedHost) headers.set("x-forwarded-host", forwardedHost);
  return { headers, nextUrl: { host } };
}

test("sameOrigin accepts absent Origin and matching host", () => {
  assert.equal(sameOrigin(request()), true);
  assert.equal(sameOrigin(request("https://learn.local")), true);
});

test("sameOrigin respects forwarded host and rejects cross-site or malformed Origin", () => {
  assert.equal(
    sameOrigin(request("https://public.example", "internal:3000", "public.example, proxy.local")),
    true,
  );
  assert.equal(sameOrigin(request("https://evil.example")), false);
  assert.equal(sameOrigin(request("not a url")), false);
});
