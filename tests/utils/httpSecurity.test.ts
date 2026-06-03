import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import {
  isAuthorized,
  PayloadTooLargeError,
  readLimitedBody,
  resolveHttpSecurity,
} from "../../src/utils/httpSecurity.js";

describe("resolveHttpSecurity", () => {
  it("defaults to loopback bind, 1 MiB body, DNS-rebinding on, no auth", () => {
    const cfg = resolveHttpSecurity({}, 3000);
    expect(cfg.host).toBe("127.0.0.1");
    expect(cfg.maxBodyBytes).toBe(1_048_576);
    expect(cfg.dnsRebindingProtection).toBe(true);
    expect(cfg.authToken).toBeUndefined();
    expect(cfg.allowedHosts).toEqual(["127.0.0.1:3000", "localhost:3000"]);
    expect(cfg.allowedOrigins).toBeUndefined();
  });

  it("reads overrides from the environment", () => {
    const cfg = resolveHttpSecurity(
      {
        MCP_HTTP_HOST: "0.0.0.0",
        MCP_HTTP_AUTH_TOKEN: "secret",
        MCP_HTTP_MAX_BODY_BYTES: "2048",
        MCP_HTTP_ALLOWED_HOSTS: "example.com:443, api.example.com",
        MCP_HTTP_ALLOWED_ORIGINS: "https://app.example.com",
        MCP_HTTP_DNS_REBINDING_PROTECTION: "false",
      },
      8080,
    );
    expect(cfg.host).toBe("0.0.0.0");
    expect(cfg.authToken).toBe("secret");
    expect(cfg.maxBodyBytes).toBe(2048);
    expect(cfg.allowedHosts).toEqual(["example.com:443", "api.example.com"]);
    expect(cfg.allowedOrigins).toEqual(["https://app.example.com"]);
    expect(cfg.dnsRebindingProtection).toBe(false);
  });

  it("falls back to defaults for invalid numeric and blank values", () => {
    const cfg = resolveHttpSecurity({ MCP_HTTP_MAX_BODY_BYTES: "-5", MCP_HTTP_HOST: "  " }, 3000);
    expect(cfg.maxBodyBytes).toBe(1_048_576);
    expect(cfg.host).toBe("127.0.0.1");
  });
});

describe("isAuthorized", () => {
  const open = resolveHttpSecurity({}, 3000);
  const secured = resolveHttpSecurity({ MCP_HTTP_AUTH_TOKEN: "s3cr3t" }, 3000);

  it("allows any request when no token is configured", () => {
    expect(isAuthorized(open, undefined)).toBe(true);
    expect(isAuthorized(open, "Bearer whatever")).toBe(true);
  });

  it("accepts the correct bearer token", () => {
    expect(isAuthorized(secured, "Bearer s3cr3t")).toBe(true);
  });

  it("rejects missing, malformed, or wrong tokens", () => {
    expect(isAuthorized(secured, undefined)).toBe(false);
    expect(isAuthorized(secured, "s3cr3t")).toBe(false); // no scheme
    expect(isAuthorized(secured, "Basic s3cr3t")).toBe(false);
    expect(isAuthorized(secured, "Bearer wrong")).toBe(false);
    expect(isAuthorized(secured, "Bearer s3cr3t-extra")).toBe(false); // length mismatch
  });
});

function mockReq(): IncomingMessage & { destroyed: boolean } {
  const emitter = new EventEmitter() as EventEmitter & { destroyed: boolean; destroy: () => void };
  emitter.destroyed = false;
  emitter.destroy = () => {
    emitter.destroyed = true;
  };
  return emitter as unknown as IncomingMessage & { destroyed: boolean };
}

describe("readLimitedBody", () => {
  it("concatenates chunks under the limit", async () => {
    const req = mockReq();
    const promise = readLimitedBody(req, 1024);
    req.emit("data", Buffer.from("hello "));
    req.emit("data", Buffer.from("world"));
    req.emit("end");
    await expect(promise).resolves.toBe("hello world");
  });

  it("resolves empty for no body", async () => {
    const req = mockReq();
    const promise = readLimitedBody(req, 1024);
    req.emit("end");
    await expect(promise).resolves.toBe("");
  });

  it("rejects when the body exceeds the limit and ignores later events", async () => {
    const req = mockReq();
    const promise = readLimitedBody(req, 8);
    req.emit("data", Buffer.from("0123456789")); // 10 bytes > 8
    await expect(promise).rejects.toBeInstanceOf(PayloadTooLargeError);
    // Late events after settling are ignored (no double-resolve / throw).
    expect(() => {
      req.emit("data", Buffer.from("more"));
      req.emit("end");
    }).not.toThrow();
  });

  it("propagates stream errors", async () => {
    const req = mockReq();
    const promise = readLimitedBody(req, 1024);
    req.emit("error", new Error("socket reset"));
    await expect(promise).rejects.toThrow("socket reset");
  });
});
