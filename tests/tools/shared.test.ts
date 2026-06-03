import { describe, expect, it } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { IndicatorRecord } from "../../src/schemas/indicator.js";
import {
  keyIndicatorList,
  registerSearchableIndicatorTool,
  resolveYearRange,
  yearRangeFields,
  type SearchableIndicatorToolConfig,
} from "../../src/tools/shared.js";

function text(result: CallToolResult): string {
  const first = result.content[0];
  return first && first.type === "text" ? first.text : "";
}

function record(over: Partial<IndicatorRecord> = {}): IndicatorRecord {
  return {
    id: "WHO:X",
    source: "who",
    indicatorCode: "X",
    indicatorName: "Example indicator",
    category: "health",
    countryCode: "LA",
    countryName: "Lao PDR",
    year: 2020,
    value: 1,
    retrievedAt: "2026-06-03T00:00:00.000Z",
    ...over,
  };
}

/** Capture the handler a register* function passes to server.registerTool. */
type ToolHandler = (args: { indicator?: string; search?: string }) => Promise<CallToolResult>;

function captureSearchableHandler(config: SearchableIndicatorToolConfig): ToolHandler {
  let handler: ToolHandler | undefined;
  const fakeServer = {
    registerTool: (_name: string, _cfg: unknown, h: ToolHandler) => {
      handler = h;
    },
  } as unknown as McpServer;
  registerSearchableIndicatorTool(fakeServer, config);
  if (!handler) throw new Error("registerSearchableIndicatorTool did not register a handler");
  return handler;
}

function baseConfig(
  over: Partial<SearchableIndicatorToolConfig> = {},
): SearchableIndicatorToolConfig {
  return {
    name: "get_laos_test_data",
    title: "Test",
    description: "Test tool",
    indicatorParamDescription: "code",
    searchParamDescription: "search",
    keyIndicators: [
      { code: "AAA", name: "Alpha" },
      { code: "BBB", name: "Beta" },
    ],
    keyListHeading: "Key TEST indicators for Lao PDR (pass one as `indicator`):",
    keyListHint: "Use `search` to find more.",
    recordNoun: "TEST",
    errorSubject: "TEST SOURCE",
    fetchIndicator: async () => [record()],
    searchIndicators: async () => [{ code: "AAA", name: "Alpha" }],
    ...over,
  };
}

describe("keyIndicatorList", () => {
  it("renders heading, code/name bullets, and an optional hint", () => {
    const out = keyIndicatorList({
      heading: "Key X (pass one):",
      indicators: [
        { code: "A", name: "Alpha" },
        { code: "B", name: "Beta" },
      ],
      hint: "Use search.",
    });
    expect(out).toBe("Key X (pass one):\n- `A` — Alpha\n- `B` — Beta\n\nUse search.");
  });

  it("omits the hint block when no hint is given", () => {
    const out = keyIndicatorList({ heading: "H", indicators: [{ code: "A", name: "Alpha" }] });
    expect(out).toBe("H\n- `A` — Alpha");
    expect(out).not.toContain("\n\n");
  });
});

describe("resolveYearRange", () => {
  it("falls back to the default start and the current year", () => {
    const { start, end } = resolveYearRange(undefined, undefined, 2010);
    expect(start).toBe(2010);
    expect(end).toBe(new Date().getFullYear());
  });

  it("respects explicit bounds", () => {
    expect(resolveYearRange(1995, 2005, 2010)).toEqual({ start: 1995, end: 2005 });
  });
});

describe("yearRangeFields", () => {
  it("accepts in-range years and rejects years below 1960", () => {
    const { startYear } = yearRangeFields(2000);
    expect(startYear.parse(2015)).toBe(2015);
    expect(startYear.safeParse(1959).success).toBe(false);
    expect(startYear.safeParse(2031).success).toBe(false);
    expect(startYear.safeParse(undefined).success).toBe(true); // optional
  });
});

describe("registerSearchableIndicatorTool", () => {
  it("lists key indicators when neither input is given", async () => {
    const handler = captureSearchableHandler(baseConfig());
    const out = text(await handler({}));
    expect(out).toContain("Key TEST indicators for Lao PDR");
    expect(out).toContain("- `AAA` — Alpha");
    expect(out).toContain("Use `search` to find more.");
  });

  it("formats search matches", async () => {
    const handler = captureSearchableHandler(
      baseConfig({ searchIndicators: async () => [{ code: "ZZZ", name: "Zeta" }] }),
    );
    const out = text(await handler({ search: "z" }));
    expect(out).toContain('Found 1 TEST indicator(s) matching "z"');
    expect(out).toContain("- `ZZZ` — Zeta");
  });

  it("reports when a search has no matches", async () => {
    const handler = captureSearchableHandler(baseConfig({ searchIndicators: async () => [] }));
    expect(text(await handler({ search: "nope" }))).toBe('No TEST indicators matched "nope".');
  });

  it("returns a jsonResult with the record count and indicator name", async () => {
    const handler = captureSearchableHandler(
      baseConfig({ fetchIndicator: async () => [record({ indicatorName: "Life expectancy" })] }),
    );
    const res = await handler({ indicator: "WHOSIS_000001" });
    const out = text(res);
    expect(res.isError).toBeFalsy();
    expect(out).toContain("Retrieved 1 TEST record(s) for WHOSIS_000001 (Life expectancy)");
    // jsonResult appends the payload as a JSON block after a blank line.
    expect(out).toContain('"indicatorName": "Life expectancy"');
  });

  it("reports when an indicator has no data", async () => {
    const handler = captureSearchableHandler(baseConfig({ fetchIndicator: async () => [] }));
    expect(text(await handler({ indicator: "MISSING" }))).toBe(
      'No TEST data for "MISSING" for Lao PDR. Use search to find a valid code.',
    );
  });

  it("maps a thrown fetch error to a tool error with the indicator as subject", async () => {
    const handler = captureSearchableHandler(
      baseConfig({
        fetchIndicator: async () => {
          throw new Error("boom");
        },
      }),
    );
    const res = await handler({ indicator: "X" });
    expect(res.isError).toBe(true);
    expect(text(res)).toContain('fetching "X"');
  });

  it("falls back to errorSubject when the no-input path throws", async () => {
    // searchIndicators throwing on a search call exercises the catch with `search` as subject.
    const handler = captureSearchableHandler(
      baseConfig({
        searchIndicators: () => {
          throw new Error("search failed");
        },
      }),
    );
    const res = await handler({ search: "q" });
    expect(res.isError).toBe(true);
    expect(text(res)).toContain('"q"');
  });
});
