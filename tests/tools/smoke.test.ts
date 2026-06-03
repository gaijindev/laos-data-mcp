import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { cache } from "../../src/cache/manager.js";
import { createConnectedClient, toolText } from "../helpers/mcp.js";

/**
 * Smoke coverage for the tool layer: every tool registers, and every tool with
 * an offline path (key-indicator listings + static-catalog stubs) returns a
 * non-error result without touching the network. Tools that require an upstream
 * fetch (agriculture, food prices, humanitarian, infrastructure, trade-total)
 * are covered for *registration* here and for behavior in their adapter tests;
 * the msw guard below fails the run if any "offline" call accidentally fetches.
 */
const msw = setupServer();
beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());
beforeEach(() => cache.reset());

/** Tools that must always be registered (drops here are regressions). */
const EXPECTED_TOOLS = [
  "get_laos_indicator",
  "get_laos_welfare_data",
  "search_laos_datasets",
  "compare_indicators",
  "get_source_status",
  "get_official_stats",
  "get_laos_agriculture_data",
  "get_laos_health_data",
  "get_laos_macro_data",
  "get_laos_food_prices",
  "get_laos_infrastructure",
  "search_mekong_data",
  "get_laos_census_data",
  "get_laos_sdg_progress",
  "get_laos_education_data",
  "get_laos_labor_data",
  "get_laos_trade_data",
  "get_laos_crime_data",
  "get_laos_global_sdg_data",
  "get_laos_governance_data",
  "search_laos_legal_texts",
  "list_available_indicators",
] as const;

describe("tool registration (smoke)", () => {
  it("registers every expected tool", async () => {
    const { client, dispose } = await createConnectedClient();
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    for (const expected of EXPECTED_TOOLS) {
      expect(names, `missing tool: ${expected}`).toContain(expected);
    }
    await dispose();
  });
});

describe("offline tool paths (smoke)", () => {
  // [tool name, args, substring expected in the offline response]
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ["get_laos_health_data", {}, "Key WHO indicators"],
    ["get_laos_education_data", {}, "Key UNESCO UIS education indicators"],
    ["get_laos_labor_data", {}, "Key ILOSTAT labour indicators"],
    ["get_laos_macro_data", {}, "Key IMF indicators"],
    ["get_laos_crime_data", {}, "UNODC dataset(s)"],
    ["get_laos_census_data", {}, "census"],
    ["search_mekong_data", {}, "MRC"],
    ["list_available_indicators", {}, "indicator"],
  ];

  for (const [name, args, needle] of cases) {
    it(`${name} returns an offline result containing "${needle}"`, async () => {
      const { client, dispose } = await createConnectedClient();
      const res = (await client.callTool({ name, arguments: args })) as CallToolResult;
      expect(res.isError, `${name} returned an error`).toBeFalsy();
      expect(toolText(res).toLowerCase()).toContain(needle.toLowerCase());
      await dispose();
    });
  }
});
