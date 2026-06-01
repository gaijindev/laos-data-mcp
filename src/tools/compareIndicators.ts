import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findCatalogEntry } from "../catalog/index.js";
import { SourceEnum } from "../schemas/source.js";
import { toToolErrorMessage } from "../utils/errors.js";
import {
  buildComparison,
  toMarkdownTable,
  toPlainTable,
  type ComparisonSeriesInput,
} from "../utils/normalize.js";
import { jsonResult, textResult } from "../utils/result.js";
import { lookupIndicatorFetcher, resolveIndicator, unsupportedSourceHint } from "./getIndicator.js";

const DESCRIPTION =
  "Fetch and compare two or more development indicators for Lao PDR, optionally across " +
  "multiple sources, into one aligned table. Use for trend analysis, correlation " +
  "exploration, or multi-dimensional policy assessment.";

export function registerCompareIndicatorsTool(server: McpServer): void {
  server.registerTool(
    "compare_indicators",
    {
      title: "Compare Laos indicators",
      description: DESCRIPTION,
      inputSchema: {
        indicators: z
          .array(
            z.object({
              code: z.string().min(1).describe('Indicator code, e.g. "SP.POP.TOTL".'),
              source: SourceEnum.optional().describe("Force a source (default: auto-detect)."),
              label: z.string().optional().describe("Display label for this series."),
            }),
          )
          .min(2)
          .max(6)
          .describe("2 to 6 indicators to compare."),
        startYear: z
          .number()
          .int()
          .min(1960)
          .max(2030)
          .optional()
          .describe("First year (default 2010)."),
        endYear: z
          .number()
          .int()
          .min(1960)
          .max(2030)
          .optional()
          .describe("Last year (default current year)."),
        outputFormat: z
          .enum(["table", "json", "markdown"])
          .optional()
          .describe('Output format (default "markdown").'),
      },
    },
    async ({ indicators, startYear, endYear, outputFormat }) => {
      const start = startYear ?? 2010;
      const end = endYear ?? new Date().getFullYear();
      const format = outputFormat ?? "markdown";

      const inputs: ComparisonSeriesInput[] = [];
      const notes: string[] = [];

      for (const spec of indicators) {
        const { source, code } = resolveIndicator(spec.code, spec.source);
        const label = spec.label ?? code;
        const fetcher = lookupIndicatorFetcher(source);
        if (!fetcher) {
          notes.push(`${label}: ${unsupportedSourceHint(source)}`);
          continue;
        }
        try {
          const records = await fetcher(code, start, end);
          if (records.length === 0) {
            notes.push(`${label}: no data for ${code} (${source}) in ${start}–${end}.`);
            continue;
          }
          inputs.push({
            label,
            source,
            code,
            indicatorName: records[0]?.indicatorName ?? code,
            unit: records.find((r) => r.unit)?.unit ?? findCatalogEntry(code)?.unit,
            records,
          });
        } catch (err) {
          notes.push(`${label}: ${toToolErrorMessage(err, { subject: code })}`);
        }
      }

      if (inputs.length === 0) {
        return {
          ...textResult(["No comparable series could be fetched.", ...notes].join("\n")),
          isError: true,
        };
      }

      const result = buildComparison(inputs, start, end);
      const summary =
        `Compared ${inputs.length} indicator(s) for Lao PDR, ${start}–${end} ` +
        `(${result.years.length} year(s) with data).` +
        (notes.length ? `\n${notes.join("\n")}` : "");

      if (format === "json") {
        return jsonResult(summary, result);
      }
      const table = format === "table" ? toPlainTable(result) : toMarkdownTable(result);
      return textResult(`${summary}\n\n${table}`);
    },
  );
}
