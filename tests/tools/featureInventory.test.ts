import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { createConnectedClient, toolText } from "../helpers/mcp.js";

const msw = setupServer();

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

async function expectValidationError(
  name: string,
  args: Record<string, unknown>,
  message: string,
): Promise<void> {
  const { client, dispose } = await createConnectedClient();
  try {
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError).toBe(true);
    expect(toolText(result)).toContain(message);
  } finally {
    await dispose();
  }
}

describe("public MCP feature inventory", () => {
  it("exposes the complete production user-facing surface", async () => {
    const { client, dispose } = await createConnectedClient();
    try {
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name).sort()).toEqual([
        "compare_indicators",
        "get_laos_agriculture_data",
        "get_laos_census_data",
        "get_laos_crime_data",
        "get_laos_education_data",
        "get_laos_food_prices",
        "get_laos_global_sdg_data",
        "get_laos_governance_data",
        "get_laos_health_data",
        "get_laos_humanitarian_data",
        "get_laos_indicator",
        "get_laos_infrastructure",
        "get_laos_labor_data",
        "get_laos_macro_data",
        "get_laos_sdg_progress",
        "get_laos_trade_data",
        "get_laos_welfare_data",
        "get_official_stats",
        "get_source_status",
        "list_available_indicators",
        "search_laos_datasets",
        "search_laos_humanitarian_datasets",
        "search_laos_legal_texts",
        "search_mekong_data",
      ]);

      const { resources } = await client.listResources();
      expect(resources.map((resource) => resource.uri).sort()).toEqual([
        "laos://indicators/catalog",
        "laos://sources/status",
      ]);

      const { prompts } = await client.listPrompts();
      expect(prompts.map((prompt) => prompt.name).sort()).toEqual([
        "data_audit",
        "policy_brief",
        "sdg_progress_audit",
        "sector_comparison",
      ]);
    } finally {
      await dispose();
    }
  });
});

describe("risk-based input edge cases", () => {
  it.each([
    ["get_laos_indicator", { indicatorCode: "SP.POP.TOTL", startYear: 2024, endYear: 2020 }],
    ["get_laos_welfare_data", { topic: "nutrition", startYear: 2024, endYear: 2020 }],
    [
      "compare_indicators",
      {
        indicators: [{ code: "SP.POP.TOTL" }, { code: "NY.GDP.PCAP.CD" }],
        startYear: 2024,
        endYear: 2020,
      },
    ],
    ["get_laos_agriculture_data", { domain: "QCL", startYear: 2024, endYear: 2020 }],
    ["get_laos_macro_data", { indicator: "NGDP_RPCH", startYear: 2024, endYear: 2020 }],
    ["get_laos_sdg_progress", { indicatorCode: "3.1.1", startYear: 2024, endYear: 2020 }],
    ["get_laos_global_sdg_data", { indicatorCode: "11.1.1", startYear: 2024, endYear: 2020 }],
    ["get_laos_governance_data", { indicatorCode: "GOV_WGI_RL", startYear: 2024, endYear: 2020 }],
    ["get_laos_trade_data", { flow: "exports", startYear: 2024, endYear: 2020 }],
  ])("%s rejects inverted year ranges before fetching upstream data", async (name, args) => {
    await expectValidationError(name, args, "startYear must be less than or equal to endYear");
  });

  it("rejects malformed WFP food-price dates before credentials or upstream data are needed", async () => {
    await expectValidationError(
      "get_laos_food_prices",
      { startDate: "not-a-date" },
      "Invalid ISO date",
    );
  });

  it("rejects inverted WFP food-price date ranges before fetching upstream data", async () => {
    await expectValidationError(
      "get_laos_food_prices",
      { startDate: "2024-12-31", endDate: "2024-01-01" },
      "startDate must be less than or equal to endDate",
    );
  });
});
