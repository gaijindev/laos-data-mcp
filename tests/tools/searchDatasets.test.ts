import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { cache } from "../../src/cache/manager.js";
import { createConnectedClient, toolText } from "../helpers/mcp.js";
import { mekongSearchHandler } from "../mocks/mekong.mock.js";

const ADB_SEARCH_URL = "https://data.adb.org/api/3/action/package_search";
const msw = setupServer();
beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());
beforeEach(() => cache.reset());

describe("search_laos_datasets (integration)", () => {
  it("returns Mekong datasets and notes ADB unavailability", async () => {
    msw.use(
      mekongSearchHandler(),
      http.get(ADB_SEARCH_URL, () => new HttpResponse(null, { status: 403 })),
    );
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "search_laos_datasets",
      arguments: { query: "rice", maxResults: 5 },
    })) as CallToolResult;
    const text = toolText(res);
    expect(text).toContain("Found");
    expect(text).toContain("Rice production by province");
    expect(text).toContain("adb:");
    await dispose();
  });

  it("filters results by topic", async () => {
    msw.use(
      mekongSearchHandler(),
      http.get(ADB_SEARCH_URL, () => new HttpResponse(null, { status: 403 })),
    );
    const { client, dispose } = await createConnectedClient();
    const res = (await client.callTool({
      name: "search_laos_datasets",
      arguments: { query: "rice", sources: ["mekong"], topics: ["environment"] },
    })) as CallToolResult;
    const text = toolText(res);
    // Only the "Forest cover" dataset is tagged environment.
    expect(text).toContain("Forest cover");
    expect(text).not.toContain("Rice production by province");
    await dispose();
  });
});
