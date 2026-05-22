import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mrcHasToken, searchMrcCatalog } from "../adapters/mrc.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Browse Mekong River Commission (MRC) datasets relevant to Lao PDR — hydrology, " +
  "flood/drought, fisheries, sediment, water quality, navigation, hydropower. Returns " +
  "catalog metadata + portal links; raw data requires free MRC registration " +
  "(MRC_SESSION_TOKEN).";

export function registerSearchMekongDataTool(server: McpServer): void {
  server.registerTool(
    "search_mekong_data",
    {
      title: "Search Mekong River Commission data (MRC)",
      description: DESCRIPTION,
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe('Filter by topic (e.g. "hydrology", "fisheries", "flood").'),
      },
    },
    async ({ topic }) => {
      try {
        const datasets = searchMrcCatalog(topic);
        const access = mrcHasToken()
          ? "MRC_SESSION_TOKEN is set; live downloads are not yet implemented (stub) — see portal.mrcmekong.org."
          : "Raw MRC data requires free registration. Set MRC_SESSION_TOKEN once registered; until then this lists catalog metadata + portal links only.";
        if (datasets.length === 0) {
          return textResult(`No MRC datasets matched "${topic}". ${access}`);
        }
        return jsonResult(
          `Found ${datasets.length} MRC dataset theme(s)${topic ? ` for "${topic}"` : ""}. ${access}`,
          datasets,
        );
      } catch (err) {
        return toToolError(err, { subject: "MRC datasets" });
      }
    },
  );
}
