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
import { MEKONG_SEARCH_URL } from "../mocks/mekong.mock.js";
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

    await dispose();
  });
});
