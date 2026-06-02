import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { cache } from "../../src/cache/manager.js";
import { createConnectedClient, toolText } from "../helpers/mcp.js";
import { data360Handler } from "../mocks/data360.mock.js";
import { faolexHandler } from "../mocks/faolex.mock.js";
import { lsbSdg311Handler, lsbSdgPingHandler } from "../mocks/lsbSdg.mock.js";
import { MEKONG_SEARCH_URL } from "../mocks/mekong.mock.js";
import { unSdgDataHandler } from "../mocks/unSdg.mock.js";
import { unicefHandlers } from "../mocks/unicef.mock.js";

const ADB_SEARCH_URL = "https://data.adb.org/api/3/action/package_search";
const msw = setupServer();
beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());
beforeEach(() => cache.reset());

/** Handlers that make 4/5 sources "reachable" for status checks. */
function pingHandlers() {
  return [
    ...unicefHandlers(),
    http.get("https://api.worldbank.org/v2/country/LA", () => HttpResponse.json([{}, [{}]])),
    http.get(MEKONG_SEARCH_URL, () =>
      HttpResponse.json({ success: true, result: { count: 0, results: [] } }),
    ),
    http.get(ADB_SEARCH_URL, () => new HttpResponse(null, { status: 403 })),
    http.get("https://laosis.lsb.gov.la", () => HttpResponse.text("ok")),
    // Expansion-source ping endpoints:
    http.get("https://fenixservices.fao.org/faostat/api/v1/en/domains", () =>
      HttpResponse.json([]),
    ),
    http.get("https://ghoapi.azureedge.net/api/Indicator", () =>
      HttpResponse.json({ value: [{}] }),
    ),
    http.get("https://www.imf.org/external/datamapper/api/v2/indicators/NGDP_RPCH", () =>
      HttpResponse.json({ indicators: { NGDP_RPCH: {} } }),
    ),
    http.get("https://data.humdata.org/api/3/action/package_search", () =>
      HttpResponse.json({ success: true, result: { count: 0, results: [] } }),
    ),
    http.get("https://overpass-api.de/api/status", () => HttpResponse.text("Connected as: 1")),
    http.get("https://portal.mrcmekong.org", () => HttpResponse.text("ok")),
    lsbSdgPingHandler(),
    unSdgDataHandler(),
    faolexHandler(),
    data360Handler(),
  ];
}

describe("get_laos_welfare_data (integration)", () => {
  it("returns normalized UNICEF nutrition records", async () => {
    msw.use(...unicefHandlers());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_welfare_data",
      arguments: { topic: "nutrition", disaggregation: "none" },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("UNICEF record(s)");
    expect(text).toContain("nutrition");
    await dispose();
  });
});

describe("get_source_status + resources (integration)", () => {
  it("reports per-source reachability and cache stats", async () => {
    msw.use(...pingHandlers());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_source_status",
      arguments: {},
    })) as CallToolResult;
    const report = JSON.parse(toolText(res).split("\n\n")[1] ?? "{}");
    expect(report.sources.length).toBeGreaterThanOrEqual(5);
    expect(report.sources.find((s: { source: string }) => s.source === "worldbank").reachable).toBe(
      true,
    );
    expect(report.sources.find((s: { source: string }) => s.source === "adb").reachable).toBe(
      false,
    );
    await dispose();
  });

  it("serves the catalog and live status resources", async () => {
    msw.use(...pingHandlers());
    const { client, dispose } = await createConnectedClient();

    const resources = await client.listResources();
    expect(resources.resources.map((r) => r.uri).sort()).toEqual([
      "laos://indicators/catalog",
      "laos://sources/status",
    ]);

    const catalog = (await client.readResource({
      uri: "laos://indicators/catalog",
    })) as ReadResourceResult;
    const catalogDoc = JSON.parse(String(catalog.contents[0]?.text ?? "{}"));
    expect(catalogDoc.totalIndicators).toBeGreaterThanOrEqual(40);

    const status = (await client.readResource({
      uri: "laos://sources/status",
    })) as ReadResourceResult;
    const statusDoc = JSON.parse(String(status.contents[0]?.text ?? "{}"));
    expect(statusDoc.sources.length).toBeGreaterThanOrEqual(5);

    await dispose();
  });
});

describe("get_laos_sdg_progress (integration)", () => {
  it("returns official LSB SDG records", async () => {
    msw.use(lsbSdg311Handler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_sdg_progress",
      arguments: { indicatorCode: "3.1.1", startYear: 2018, endYear: 2019 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("official LSB SDG record(s)");
    expect(text).toContain("Maternal mortality ratio");
    await dispose();
  });
});

describe("get_laos_global_sdg_data (integration)", () => {
  it("returns UN global SDG records for Laos", async () => {
    msw.use(unSdgDataHandler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_global_sdg_data",
      arguments: { indicatorCode: "11.1.1", startYear: 2018, endYear: 2020 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("UN global SDG record(s)");
    expect(text).toContain("urban population living in slums");
    await dispose();
  });
});

describe("search_laos_legal_texts (integration)", () => {
  it("returns FAOLEX legal text metadata", async () => {
    msw.use(faolexHandler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "search_laos_legal_texts",
      arguments: { query: "mining", type: "legislation", maxResults: 5 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("FAOLEX legal text(s)");
    expect(text).toContain("Mining Law");
    await dispose();
  });
});

describe("get_laos_governance_data (integration)", () => {
  it("returns Data360 governance records", async () => {
    msw.use(data360Handler());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_laos_governance_data",
      arguments: { indicatorCode: "GOV_WGI_RL", startYear: 2023, endYear: 2024 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("Data360 governance record(s)");
    expect(text).toContain("Rule of law");
    await dispose();
  });
});

describe("get_official_stats (integration)", () => {
  it("lists Laosis categories filtered by substring", async () => {
    msw.use(...pingHandlers());
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "get_official_stats",
      arguments: { category: "agriculture" },
    })) as CallToolResult;
    expect(toolText(res)).toContain("Agriculture, Forestry and Fishery");
    await dispose();
  });
});

describe("prompts (integration)", () => {
  it("registers and renders all three prompts", async () => {
    const { client, dispose } = await createConnectedClient();
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual([
      "data_audit",
      "policy_brief",
      "sdg_progress_audit",
      "sector_comparison",
    ]);

    const brief = (await client.getPrompt({
      name: "policy_brief",
      arguments: { topic: "rural electrification", audience: "development bank", depth: "summary" },
    })) as GetPromptResult;
    const text = brief.messages[0]?.content;
    expect(text && text.type === "text" ? text.text : "").toContain("rural electrification");

    const audit = (await client.getPrompt({
      name: "data_audit",
      arguments: { topic: "forestry" },
    })) as GetPromptResult;
    const auditText = audit.messages[0]?.content;
    expect(auditText && auditText.type === "text" ? auditText.text : "").toContain(
      "get_source_status",
    );

    const sector = (await client.getPrompt({
      name: "sector_comparison",
      arguments: { sector_a: "health", sector_b: "education", years: "2015-2024" },
    })) as GetPromptResult;
    const sectorText = sector.messages[0]?.content;
    expect(sectorText && sectorText.type === "text" ? sectorText.text : "").toContain(
      "compare_indicators",
    );

    const sdg = (await client.getPrompt({
      name: "sdg_progress_audit",
      arguments: { goal: "SDG 18", audience: "province officers" },
    })) as GetPromptResult;
    const sdgText = sdg.messages[0]?.content;
    expect(sdgText && sdgText.type === "text" ? sdgText.text : "").toContain(
      "get_laos_sdg_progress",
    );

    await dispose();
  });
});
