import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function sdgProgressAuditText(goal: string, audience: string): string {
  return `Audit Lao PDR SDG progress for "${goal}" using official Lao Statistics Bureau SDG Platform data first.

Steps:
1. Call get_laos_sdg_progress with \`search\` or \`goal\` to discover official LSB SDG indicators relevant to "${goal}".
2. Fetch the most relevant official indicators with get_laos_sdg_progress using \`indicatorCode\`; use \`latestOnly=false\` when trend history is needed.
3. Call get_source_status to record whether the LSB SDG source and related sources are reachable.
4. Optionally call list_available_indicators and get_laos_indicator for corroborating World Bank, UNICEF, WHO, IMF, or census series.

Then produce a concise audit for ${audience}:
- **Official indicators found** - codes, names, latest year, latest value, and unit.
- **Trend read** - direction of change where multiple years exist.
- **Freshness and coverage** - missing years, old latest observations, and missing disaggregations.
- **Policy relevance** - what the current values imply for planning or community action.
- **Data caveats** - distinguish official LSB SDG data from partner/international sources.
- **Next data actions** - practical steps to improve collection, publication, or reuse.

Cite the source, indicator code, year, and unit for every figure. Do not estimate missing values.`;
}

export function registerSdgProgressAuditPrompt(server: McpServer): void {
  server.registerPrompt(
    "sdg_progress_audit",
    {
      title: "Laos SDG progress audit",
      description:
        "Audit Lao PDR SDG progress using official LSB SDG Platform indicators and related sources.",
      argsSchema: {
        goal: z.string().describe('Goal/topic to audit, e.g. "SDG 3", "UXO", or "poverty".'),
        audience: z
          .string()
          .optional()
          .describe('Audience, e.g. "ministry planners", "province officers", "community groups".'),
      },
    },
    ({ goal, audience }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: sdgProgressAuditText(goal, audience ?? "Lao government and community users"),
          },
        },
      ],
    }),
  );
}
