import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IndicatorRecord } from "../schemas/indicator.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

/**
 * Shared building blocks for the data tools in this directory.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ keyIndicatorList / resolveYearRange / yearRangeFields         │
 *   │   small, composable helpers used by the tools that each have  │
 *   │   their own distinct shape (agriculture, macro, trade).       │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ registerSearchableIndicatorTool                               │
 *   │   full factory for the tools that are structurally identical  │
 *   │   (health, education, labor): search / indicator / list.      │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The split is deliberate: only health/education/labor share the exact
 * three-branch shape, so only they go through the factory. The others reuse
 * the helpers but keep their own explicit registerTool call, because folding
 * their differing shapes (truncation, year ranges, partner breakdowns) into
 * one config object would make the factory leaky.
 */

/** Anything with a code + human-readable name — the shape of every KEY_* list. */
export interface CodeNamed {
  code: string;
  name: string;
}

/**
 * Render a "Key <X> indicators (pass one as `indicator`)" listing.
 * Used by macro, trade, and (via the factory) health/education/labor.
 */
export function keyIndicatorList(opts: {
  heading: string;
  indicators: readonly CodeNamed[];
  /** Optional trailing hint, e.g. 'Use `search` ("literacy") to find more codes.' */
  hint?: string;
}): string {
  const lines = [opts.heading, ...opts.indicators.map((i) => `- \`${i.code}\` — ${i.name}`)];
  if (opts.hint) lines.push("", opts.hint);
  return lines.join("\n");
}

/** Resolve optional start/end years to concrete bounds. */
export function resolveYearRange(
  startYear: number | undefined,
  endYear: number | undefined,
  defaultStart: number,
): { start: number; end: number } {
  return { start: startYear ?? defaultStart, end: endYear ?? new Date().getFullYear() };
}

/**
 * Shared optional startYear/endYear Zod fields (1960–2030). `defaultStartLabel`
 * only sets the describe() text — `resolveYearRange` applies the actual default.
 * Tools with a different floor (e.g. Comtrade's 1990) keep their own fields.
 */
export function yearRangeFields(defaultStartLabel: string | number): {
  startYear: z.ZodOptional<z.ZodNumber>;
  endYear: z.ZodOptional<z.ZodNumber>;
} {
  return {
    startYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe(`First year (default ${defaultStartLabel}).`),
    endYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe("Last year (default current year)."),
  };
}

/**
 * Configuration for a "searchable indicator" tool — the health/education/labor
 * shape: pass `search` to find codes by name, `indicator` to fetch a time
 * series, or neither to list the curated key indicators.
 */
export interface SearchableIndicatorToolConfig {
  name: string;
  title: string;
  description: string;
  /** describe() text for the `indicator` parameter. */
  indicatorParamDescription: string;
  /** describe() text for the `search` parameter. */
  searchParamDescription: string;
  /** Curated key indicators, shown when neither input is given. */
  keyIndicators: readonly CodeNamed[];
  /** Heading line for the key-indicator listing. */
  keyListHeading: string;
  /** Trailing hint for the key-indicator listing. */
  keyListHint: string;
  /** Noun used in result/empty messages, e.g. "WHO", "UNESCO UIS", "ILOSTAT". */
  recordNoun: string;
  /** Fallback `subject` for error messages when no input is given, e.g. "WHO GHO". */
  errorSubject: string;
  /** Fetch a time series for one indicator code. */
  fetchIndicator: (code: string) => Promise<IndicatorRecord[]>;
  /** Search curated/known indicators by free-text query. */
  searchIndicators: (query: string) => Promise<CodeNamed[]> | CodeNamed[];
}

/**
 * Register a searchable-indicator tool (health/education/labor). Centralizes the
 * three-branch handler, the empty/found/no-data messages, and the toToolError
 * tail so the per-source files only declare their copy + adapter wiring.
 */
export function registerSearchableIndicatorTool(
  server: McpServer,
  config: SearchableIndicatorToolConfig,
): void {
  server.registerTool(
    config.name,
    {
      title: config.title,
      description: config.description,
      inputSchema: {
        indicator: z.string().optional().describe(config.indicatorParamDescription),
        search: z.string().optional().describe(config.searchParamDescription),
      },
    },
    async ({ indicator, search }) => {
      try {
        if (search) {
          const matches = await config.searchIndicators(search);
          if (matches.length === 0) {
            return textResult(`No ${config.recordNoun} indicators matched "${search}".`);
          }
          return textResult(
            [
              `Found ${matches.length} ${config.recordNoun} indicator(s) matching "${search}":`,
              ...matches.map((m) => `- \`${m.code}\` — ${m.name}`),
            ].join("\n"),
          );
        }
        if (indicator) {
          const records = await config.fetchIndicator(indicator);
          if (records.length === 0) {
            return textResult(
              `No ${config.recordNoun} data for "${indicator}" for Lao PDR. Use search to find a valid code.`,
            );
          }
          return jsonResult(
            `Retrieved ${records.length} ${config.recordNoun} record(s) for ${indicator} (${records[0]?.indicatorName ?? indicator}), Lao PDR.`,
            records,
          );
        }
        return textResult(
          keyIndicatorList({
            heading: config.keyListHeading,
            indicators: config.keyIndicators,
            hint: config.keyListHint,
          }),
        );
      } catch (err) {
        return toToolError(err, { subject: indicator ?? search ?? config.errorSubject });
      }
    },
  );
}
