import { timingSafeEqual } from "node:crypto";
import { sameOrigin, type SameOriginRequest } from "./server-request";

export interface ExternalHostRequest extends SameOriginRequest {
  headers: Headers;
}

function bearerToken(headers: Headers): string | undefined {
  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  const token = authorization.slice("Bearer ".length).trim();
  return token || undefined;
}

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizeAssistantHostRequest(
  request: ExternalHostRequest,
  configuredToken = process.env.ABLEARC_HOST_TOKEN?.trim(),
): boolean {
  const origin = request.headers.get("origin");
  if (origin && sameOrigin(request)) return true;

  const supplied = bearerToken(request.headers);
  return Boolean(
    configuredToken
    && supplied
    && secureEqual(supplied, configuredToken),
  );
}
