import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function policyBriefText(topic: string, audience: string, depth: string): string {
  const detail =
    depth === "summary"
      ? "Keep it concise (roughly one page); lead with the headline numbers."
      : "Be thorough; include year-by-year trends and disaggregation (sex/area/wealth) where available.";
  return `Produce a policy brief on "${topic}" for Lao PDR, written for: ${audience}.

Gather the data first, using this server's tools:
1. Call list_available_indicators with a category or search matching "${topic}" to find relevant indicator codes.
2. Fetch the 3-5 most relevant indicators:
   - economic / demographic / infrastructure series via get_laos_indicator,
   - child welfare / health / education / nutrition / gender / WASH via get_laos_welfare_data.
3. Optionally call search_laos_datasets for "${topic}" to cite supporting datasets.

Then structure the brief with these sections:
- **Executive Summary** — 3-5 bullet takeaways with the key figures.
- **Current Situation** — the latest values, each with its year and source.
- **Key Trends** — direction and pace of change over the available years.
- **Gaps & Recommendations** — data gaps, risks, and concrete actions for ${audience}.
- **Data Sources** — list every indicator/dataset used (code, source, year range).

${detail}
Cite the source and year for every number. If a number is unavailable, say so explicitly rather than estimating.`;
}

export function registerPolicyBriefPrompt(server: McpServer): void {
  server.registerPrompt(
    "policy_brief",
    {
      title: "Laos policy brief",
      description:
        "Generate a structured policy brief on a development topic for Lao PDR, pulling supporting data from connected sources.",
      argsSchema: {
        topic: z.string().describe('Topic, e.g. "rural electrification" or "child malnutrition".'),
        audience: z
          .string()
          .describe('Audience, e.g. "ministry officials", "development bank", "NGO".'),
        depth: z.string().optional().describe('"summary" or "detailed" (default "detailed").'),
      },
    },
    ({ topic, audience, depth }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: policyBriefText(topic, audience, depth?.toLowerCase() === "summary" ? "summary" : "detailed"),
          },
        },
      ],
    }),
  );
}
