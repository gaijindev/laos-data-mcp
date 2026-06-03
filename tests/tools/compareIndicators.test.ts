import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { cache } from "../../src/cache/manager.js";
import { createConnectedClient, toolText } from "../helpers/mcp.js";
import { wbSuccessHandler } from "../mocks/worldbank.mock.js";

const msw = setupServer();
beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());
beforeEach(() => cache.reset());

describe("compare_indicators (integration)", () => {
  it("merges two indicators into a markdown table", async () => {
    msw.use(wbSuccessHandler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "compare_indicators",
      arguments: {
        indicators: [
          { code: "SP.POP.TOTL", label: "Population" },
          { code: "NY.GDP.MKTP.CD", label: "GDP" },
        ],
        startYear: 2020,
        endYear: 2022,
        outputFormat: "markdown",
      },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("Compared 2 indicator(s)");
    expect(text).toContain("| Year |");
    expect(text).toContain("Population");
    expect(text).toContain("GDP");
    await dispose();
  });

  it("emits structured JSON when outputFormat=json", async () => {
    msw.use(wbSuccessHandler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "compare_indicators",
      arguments: {
        indicators: [{ code: "SP.POP.TOTL" }, { code: "NY.GDP.MKTP.CD" }],
        startYear: 2020,
        endYear: 2022,
        outputFormat: "json",
      },
    })) as CallToolResult;
    const json = JSON.parse(toolText(res).split("\n\n")[1] ?? "{}");
    expect(json.series).toHaveLength(2);
    expect(Array.isArray(json.years)).toBe(true);
    await dispose();
  });

  // Regression guard for the parallelized fetch loop: fetches run via
  // Promise.allSettled, so one failing source must not sink the others. A
  // sequential `for await` would still pass; using `Promise.all` would break
  // this (the whole call would reject on the 503).
  it("returns the healthy series and notes the failure when one source is down", async () => {
    msw.use(
      // First-registered handler wins in msw: force this one code to 503.
      http.get("https://api.worldbank.org/v2/country/LA/indicator/BAD.CODE.503", () =>
        HttpResponse.json(null, { status: 503 }),
      ),
      wbSuccessHandler(),
    );
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "compare_indicators",
      arguments: {
        indicators: [
          { code: "SP.POP.TOTL", label: "Population" },
          { code: "BAD.CODE.503", label: "Broken" },
        ],
        startYear: 2020,
        endYear: 2022,
        outputFormat: "markdown",
      },
    })) as CallToolResult;
    const text = toolText(res);
    expect(res.isError).toBeFalsy();
    expect(text).toContain("Compared 1 indicator(s)");
    expect(text).toContain("Population");
    expect(text).toContain("Broken:"); // the failed series is surfaced as a note
    await dispose();
  });
});
