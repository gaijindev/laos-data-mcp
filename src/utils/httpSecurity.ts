/**
 * Security helpers for the optional HTTP transport (src/index.ts). The stdio
 * transport is local-only and needs none of this; the HTTP transport exposes a
 * network endpoint and must be locked down before any non-local deployment.
 *
 * Covers: bind host, bearer-token auth, request body size limit, and the
 * allowed-hosts/origins lists that drive the SDK's DNS-rebinding protection.
 */
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

export interface HttpSecurityConfig {
  /** Interface to bind. Defaults to loopback so the server isn't public. */
  host: string;
  /** When set, requests must send `Authorization: Bearer <token>`. */
  authToken?: string;
  /** Maximum accepted request body size, in bytes. */
  maxBodyBytes: number;
  /** Host header allowlist for DNS-rebinding protection. */
  allowedHosts?: string[];
  /** Origin header allowlist for DNS-rebinding protection. */
  allowedOrigins?: string[];
  /** Whether to enable the SDK's DNS-rebinding protection. */
  dnsRebindingProtection: boolean;
}

const DEFAULT_MAX_BODY_BYTES = 1_048_576; // 1 MiB — JSON-RPC requests are tiny

function splitList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function positiveOr(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Build the HTTP security config from environment variables. */
export function resolveHttpSecurity(
  env: NodeJS.ProcessEnv = process.env,
  port = 3000,
): HttpSecurityConfig {
  const host = env.MCP_HTTP_HOST?.trim() || "127.0.0.1";
  return {
    host,
    authToken: env.MCP_HTTP_AUTH_TOKEN?.trim() || undefined,
    maxBodyBytes: positiveOr(env.MCP_HTTP_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES),
    // Default the host allowlist to the bind address so DNS-rebinding
    // protection is meaningful even without explicit configuration.
    allowedHosts:
      splitList(env.MCP_HTTP_ALLOWED_HOSTS) ?? [`${host}:${port}`, `localhost:${port}`],
    allowedOrigins: splitList(env.MCP_HTTP_ALLOWED_ORIGINS),
    dnsRebindingProtection: env.MCP_HTTP_DNS_REBINDING_PROTECTION !== "false",
  };
}

/**
 * Constant-time bearer-token check. Returns true when no token is configured
 * (auth disabled). Uses timingSafeEqual to avoid leaking the token via timing.
 */
export function isAuthorized(
  config: HttpSecurityConfig,
  authorizationHeader: string | undefined,
): boolean {
  if (!config.authToken) return true;
  const prefix = "Bearer ";
  if (typeof authorizationHeader !== "string" || !authorizationHeader.startsWith(prefix)) {
    return false;
  }
  const presented = Buffer.from(authorizationHeader.slice(prefix.length));
  const expected = Buffer.from(config.authToken);
  if (presented.length !== expected.length) return false;
  return timingSafeEqual(presented, expected);
}

export class PayloadTooLargeError extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(`Request body exceeds the ${limit}-byte limit.`);
    this.name = "PayloadTooLargeError";
    this.limit = limit;
  }
}

/**
 * Read a request body into a string, rejecting with PayloadTooLargeError once
 * accumulated bytes exceed `maxBytes`. Returns "" for an empty body. The caller
 * is responsible for sending a response and then destroying the socket — doing
 * it here would tear down the connection before the 413 could be written.
 */
export function readLimitedBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    req.on("data", (chunk: Buffer) => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) {
        settled = true;
        reject(new PayloadTooLargeError(maxBytes));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}
