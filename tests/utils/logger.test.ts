import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/utils/logger.js";

function capture(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    calls.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  });
  return { calls, restore: () => spy.mockRestore() };
}

describe("logger redaction", () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
    vi.restoreAllMocks();
  });

  it("redacts bearer tokens in strings", () => {
    const { calls, restore } = capture();
    logger.error("upstream said: Authorization: Bearer abc123.def-456_ghi");
    restore();
    expect(calls[0]).toContain("Bearer ***");
    expect(calls[0]).not.toContain("abc123");
  });

  it("redacts known secret env values wherever they appear", () => {
    process.env.WFP_CLIENT_SECRET = "super-secret-value-123";
    process.env.COMTRADE_API_KEY = "comtrade-secret-value-123";
    const { calls, restore } = capture();
    logger.error(
      "token exchange failed for super-secret-value-123 and comtrade-secret-value-123 at /token",
    );
    restore();
    expect(calls[0]).toContain("***");
    expect(calls[0]).not.toContain("super-secret-value-123");
    expect(calls[0]).not.toContain("comtrade-secret-value-123");
  });

  it("reduces Errors to message/stack and drops attached objects (e.g. axios config)", () => {
    const { calls, restore } = capture();
    // Simulate an axios-style error carrying a credential in an enumerable prop.
    const err = new Error("Request failed with status code 401") as Error & {
      config: unknown;
    };
    err.config = { headers: { Authorization: "Bearer leaky-token-value" } };
    logger.error("HTTP request handling failed:", err);
    restore();
    const line = calls.join(" ");
    expect(line).toContain("Request failed with status code 401");
    expect(line).not.toContain("leaky-token-value");
  });

  it("passes through non-sensitive primitives", () => {
    const { calls, restore } = capture();
    logger.error("count", 42, true);
    restore();
    expect(calls[0]).toContain("count");
    expect(calls[0]).toContain("42");
  });

  it("suppresses logs below the configured level (debug by default off)", () => {
    const { calls, restore } = capture();
    logger.debug("should not appear");
    restore();
    expect(calls).toHaveLength(0);
  });
});
