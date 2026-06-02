import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function dataAuditText(topic: string): string {
  return `Audit what data is available, missing, or outdated for "${topic}" in Lao PDR across all connected sources.

Steps:
1. Call list_available_indicators (filter/search by "${topic}") to enumerate indicators and their sources.
2. For a few of those indicators, call get_laos_indicator / get_laos_welfare_data to see which years actually have values (note the most recent year per indicator).
3. Call search_laos_datasets for "${topic}" to find supporting dataset files (and which sources have them).
4. Call get_source_status to record which sources are currently reachable.

Then produce an audit report:
- **What exists** — indicators/datasets available, grouped by source.
- **Coverage** — for each, the year range present and the latest available year.
- **Gaps** — indicators with no recent data, sources missing this topic, and any unreachable sources.
- **Freshness flags** — anything whose latest data point is more than ~3 years old.
- **Recommended next steps** — concrete data-collection or sourcing actions to close the gaps.

Be precise about years and sources. Distinguish "no data exists" from "source temporarily unreachable" (use get_source_status to tell them apart).`;
}

export function registerDataAuditPrompt(server: McpServer): void {
  server.registerPrompt(
    "data_audit",
    {
      title: "Laos data availability audit",
      description:
        "Audit what data is available, missing, or outdated for a given topic across connected sources.",
      argsSchema: {
        topic: z.string().describe('Topic to audit, e.g. "maternal health" or "forestry".'),
      },
    },
    ({ topic }) => ({
      messages: [{ role: "user", content: { type: "text", text: dataAuditText(topic) } }],
    }),
  );
}
