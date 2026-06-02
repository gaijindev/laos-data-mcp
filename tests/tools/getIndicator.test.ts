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
import { data360Handler } from "../mocks/data360.mock.js";
import { unSdgDataHandler } from "../mocks/unSdg.mock.js";

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

  it("auto-routes cataloged UN SDG indicators", async () => {
    msw.use(unSdgDataHandler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_indicator",
      arguments: { indicatorCode: "UN_SDG:11.1.1", startYear: 2018, endYear: 2020 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("from un_sdg");
    expect(text).toContain("urban population living in slums");
    await dispose();
  });

  it("auto-routes cataloged Data360 indicators", async () => {
    msw.use(data360Handler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_indicator",
      arguments: { indicatorCode: "DATA360:GOV_WGI_RL", startYear: 2023, endYear: 2024 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("from data360");
    expect(text).toContain("Rule of law");
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

  it("registers the core tools (plus any expansion tools)", async () => {
    const { client, dispose } = await createConnectedClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "compare_indicators",
        "get_laos_indicator",
        "get_laos_welfare_data",
        "get_official_stats",
        "get_source_status",
        "get_laos_global_sdg_data",
        "get_laos_governance_data",
        "list_available_indicators",
        "search_laos_datasets",
      ]),
    );
    await dispose();
  });
});
