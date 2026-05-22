import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { cache } from "../../src/cache/manager.js";
import { createConnectedClient, toolText } from "../helpers/mcp.js";
import {
  WB_INDICATOR_URL,
  wbEmptyResponse,
  wbInvalidResponse,
  wbSuccessHandler,
} from "../mocks/worldbank.mock.js";

const msw = setupServer();
beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());
beforeEach(() => cache.reset());

describe("get_laos_indicator (integration)", () => {
  it("returns normalized World Bank records for a valid code", async () => {
    msw.use(wbSuccessHandler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_indicator",
      arguments: { indicatorCode: "SP.POP.TOTL", startYear: 2020, endYear: 2022 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("Retrieved");
    expect(text).toContain("Population, total");
    await dispose();
  });

  it("reports an invalid code with a helpful suggestion", async () => {
    msw.use(http.get(WB_INDICATOR_URL, () => HttpResponse.json(wbInvalidResponse)));
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_indicator",
      arguments: { indicatorCode: "NOPE.XYZ" },
    })) as CallToolResult;
    expect(res.isError).toBe(true);
    expect(toolText(res)).toContain("list_available_indicators");
    await dispose();
  });

  it("supports the timeseries output format", async () => {
    msw.use(wbSuccessHandler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_indicator",
      arguments: {
        indicatorCode: "SP.POP.TOTL",
        startYear: 2020,
        endYear: 2022,
        format: "timeseries",
      },
    })) as CallToolResult;
    const json = JSON.parse(toolText(res).split("\n\n")[1] ?? "{}");
    expect(Array.isArray(json.points)).toBe(true);
    expect(json.points[0]).toHaveProperty("year");
    await dispose();
  });

  it("returns a friendly message when no data exists in range", async () => {
    msw.use(http.get(WB_INDICATOR_URL, () => HttpResponse.json(wbEmptyResponse)));
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_indicator",
      arguments: { indicatorCode: "SP.POP.TOTL" },
    })) as CallToolResult;
    expect(toolText(res)).toContain("No data found");
    await dispose();
  });

  it("redirects dataset sources to the right tool", async () => {
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_indicator",
      arguments: { indicatorCode: "anything", source: "mekong" },
    })) as CallToolResult;
    expect(res.isError).toBe(true);
    expect(toolText(res)).toContain("search_laos_datasets");
    await dispose();
  });
});

describe("list_available_indicators (integration)", () => {
  it("lists catalog entries filtered by category", async () => {
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "list_available_indicators",
      arguments: { category: "health" },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("## health");
    expect(text).toContain("SH.DYN.MORT");
    await dispose();
  });

  it("registers exactly the seven expected tools", async () => {
    const { client, dispose } = await createConnectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "compare_indicators",
        "get_laos_indicator",
        "get_laos_welfare_data",
        "get_official_stats",
        "get_source_status",
        "list_available_indicators",
        "search_laos_datasets",
      ].sort(),
    );
    await dispose();
  });
});
