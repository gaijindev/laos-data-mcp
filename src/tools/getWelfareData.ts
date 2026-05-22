import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchUnicefWelfare,
  TOPIC_DATAFLOWS,
  WELFARE_TOPICS,
  type WelfareTopic,
} from "../adapters/unicef.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const MAX_RECORDS = 800;

const DESCRIPTION =
  "Fetch child welfare, maternal health, education, nutrition, gender, and WASH data " +
  "for Lao PDR from UNICEF's data warehouse (SDMX). Returns disaggregated data where " +
  "available (by sex, area, or wealth quintile). Use this for UNICEF welfare indicators; " +
  "use get_laos_indicator for World Bank economic/demographic series.";

export function registerGetWelfareDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_welfare_data",
    {
      title: "Get Laos welfare data (UNICEF)",
      description: DESCRIPTION,
      inputSchema: {
        topic: z
          .enum(WELFARE_TOPICS as [WelfareTopic, ...WelfareTopic[]])
          .describe("Welfare topic to fetch."),
        startYear: z.number().int().min(1960).max(2030).optional().describe("First year (default 2000)."),
        endYear: z.number().int().min(1960).max(2030).optional().describe("Last year (default current year)."),
        disaggregation: z
          .enum(["sex", "area", "wealth", "none"])
          .optional()
          .describe('Disaggregation dimension (default "none" = national totals).'),
      },
    },
    async ({ topic, startYear, endYear, disaggregation }) => {
      const start = startYear ?? 2000;
      const end = endYear ?? new Date().getFullYear();
      const disagg = disaggregation ?? "none";
      try {
        const records = await fetchUnicefWelfare(topic, {
          startYear: start,
          endYear: end,
          disaggregation: disagg,
        });
        if (records.length === 0) {
          return textResult(
            `No UNICEF data found for topic "${topic}" (dataflow ${TOPIC_DATAFLOWS[topic]}) for ` +
              `${start}–${end}. Try a wider year range or disaggregation="none".`,
          );
        }
        const truncated = records.length > MAX_RECORDS;
        const payload = truncated ? records.slice(0, MAX_RECORDS) : records;
        const note = truncated ? ` (showing first ${MAX_RECORDS})` : "";
        return jsonResult(
          `Retrieved ${records.length} UNICEF record(s)${note} for topic "${topic}" ` +
            `(dataflow ${TOPIC_DATAFLOWS[topic]}), disaggregation=${disagg}, ${start}–${end}.`,
          payload,
        );
      } catch (err) {
        return toToolError(err, { subject: `${topic} (UNICEF)` });
      }
    },
  );
}
