import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function sectorComparisonText(sectorA: string, sectorB: string, years?: string): string {
  const range = years && years.trim().length > 0 ? years.trim() : "the last ~10 years";
  return `Compare two development sectors in Lao PDR: "${sectorA}" vs "${sectorB}", over ${range}.

Steps:
1. For each sector, call list_available_indicators (filter by category or search) to find 2-3 representative indicators.
2. Fetch them with get_laos_indicator and/or get_laos_welfare_data.
3. Use compare_indicators to put the strongest indicators from both sectors into one aligned table${
    years ? ` (set startYear/endYear to match ${range})` : ""
  }.

Then write the comparison:
- **Side-by-side table** of the key indicators (from compare_indicators).
- **Where each sector stands** — latest values with year + source.
- **Trajectories** — which sector is improving faster, and any divergence.
- **Trade-offs & implications** — what the contrast suggests for prioritization.
- **Data caveats** — differing units, missing years, or source limitations.

Always show the year and source for each figure; never invent missing values.`;
}

export function registerSectorComparisonPrompt(server: McpServer): void {
  server.registerPrompt(
    "sector_comparison",
    {
      title: "Laos sector comparison",
      description:
        "Compare two development sectors in Lao PDR using available data (e.g. health vs education, urban vs rural access).",
      argsSchema: {
        sector_a: z.string().describe('First sector, e.g. "health".'),
        sector_b: z.string().describe('Second sector, e.g. "education".'),
        years: z.string().optional().describe('Optional year range, e.g. "2015-2024".'),
      },
    },
    ({ sector_a, sector_b, years }) => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: sectorComparisonText(sector_a, sector_b, years) },
        },
      ],
    }),
  );
}
