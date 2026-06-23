import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { collectSourceStatus } from "../tools/getSourceStatus.js";

export const SOURCE_STATUS_URI = "laos://sources/status";

export function registerSourceSummaryResource(server: McpServer): void {
  server.registerResource(
    "source-status",
    SOURCE_STATUS_URI,
    {
      title: "Laos data source status",
      description:
        "Live connectivity status, last-fetch time, cache hit rate, and source-specific notes for each connected Lao PDR data source.",
      mimeType: "application/json",
    },
    async (uri) => {
      const report = await collectSourceStatus();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    },
  );
}
