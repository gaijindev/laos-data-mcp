import { describe, it, expect } from "vitest";
import {
  SourceUnavailableError,
  InvalidIndicatorError,
  RateLimitError,
  DataParseError,
  toToolErrorMessage,
  toToolError,
} from "../../src/utils/errors.js";

describe("toToolErrorMessage", () => {
  it("explains an unavailable source and suggests get_source_status", () => {
    const msg = toToolErrorMessage(new SourceUnavailableError("worldbank", "HTTP 500"));
    expect(msg).toContain("worldbank");
    expect(msg).toContain("get_source_status");
    expect(msg).toContain("Try:");
  });

  it("points an invalid indicator at list_available_indicators", () => {
    const msg = toToolErrorMessage(new InvalidIndicatorError("BAD.CODE", "worldbank"), {
      subject: "BAD.CODE",
    });
    expect(msg).toContain("list_available_indicators");
  });

  it("includes the retry-after hint for rate limits", () => {
    expect(toToolErrorMessage(new RateLimitError("unicef", 30))).toContain("30s");
  });

  it("handles a generic Error", () => {
    expect(toToolErrorMessage(new Error("boom"), { subject: "x" })).toContain("boom");
  });

  it("handles a non-Error throwable", () => {
    expect(toToolErrorMessage("nope")).toContain("unknown error");
  });
});

describe("error classes", () => {
  it("DataParseError truncates the raw sample to 300 chars", () => {
    const e = new DataParseError("mekong", "x".repeat(500));
    expect(e.rawSample?.length).toBe(300);
    expect(e.source).toBe("mekong");
  });

  it("preserves the class name for instanceof and logging", () => {
    expect(new RateLimitError("adb").name).toBe("RateLimitError");
  });
});

describe("toToolError", () => {
  it("wraps a throwable into an isError tool result", () => {
    const res = toToolError(new Error("boom"), { subject: "thing" });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("boom");
  });
});
