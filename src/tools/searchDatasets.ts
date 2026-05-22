import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAdbDatasets } from "../adapters/adb.js";
import { fetchMekongDatasets } from "../adapters/mekong.js";
import type { DatasetMetadata } from "../schemas/dataset.js";
import { SourceEnum } from "../schemas/source.js";
import { toToolErrorMessage } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

type DatasetSource = "mekong" | "adb";

const DATASET_FETCHERS: Record<DatasetSource, (q: string, n: number) => Promise<DatasetMetadata[]>> = {
  mekong: fetchMekongDatasets,
  adb: fetchAdbDatasets,
};

const DEFAULT_SOURCES: DatasetSource[] = ["mekong", "adb"];

const DESCRIPTION =
  "Search for datasets about Lao PDR across the Open Development Mekong platform and " +
  "the ADB Data Library. Returns dataset titles, descriptions, topics, formats, and " +
  "download URLs. Use when you need raw data files rather than pre-processed indicators. " +
  "(ADB is behind a bot challenge and is best-effort.)";

export function registerSearchDatasetsTool(server: McpServer): void {
  server.registerTool(
    "search_laos_datasets",
    {
      title: "Search Laos datasets",
      description: DESCRIPTION,
      inputSchema: {
        query: z.string().min(1).describe("Free-text search query."),
        sources: z
          .array(SourceEnum)
          .optional()
          .describe('Sources to search (only "mekong" and "adb" apply). Default: both.'),
        topics: z.array(z.string()).optional().describe("Filter results to these topic tags."),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results per source (default 10, max 50)."),
      },
    },
    async ({ query, sources, topics, maxResults }) => {
      const max = Math.min(Math.max(maxResults ?? 10, 1), 50);
      const requested = sources ?? DEFAULT_SOURCES;
      const datasetSources = requested.filter(
        (s): s is DatasetSource => s === "mekong" || s === "adb",
      );
      const ignored = [...new Set(requested.filter((s) => s !== "mekong" && s !== "adb"))];
      const chosen = datasetSources.length ? [...new Set(datasetSources)] : DEFAULT_SOURCES;

      const settled = await Promise.allSettled(
        chosen.map((s) => DATASET_FETCHERS[s](query, max)),
      );

      const datasets: DatasetMetadata[] = [];
      const notes: string[] = [];
      if (ignored.length) {
        notes.push(
          `Note: ${ignored.join(", ")} provide indicators, not datasets — use get_laos_indicator / get_laos_welfare_data.`,
        );
      }
      settled.forEach((r, i) => {
        const s = chosen[i]!;
        if (r.status === "fulfilled") datasets.push(...r.value);
        else notes.push(`${s}: ${toToolErrorMessage(r.reason)}`);
      });

      let filtered = datasets;
      if (topics?.length) {
        const wanted = topics.map((t) => t.toLowerCase());
        filtered = datasets.filter((d) =>
          d.topics.some((t) => wanted.some((w) => t.toLowerCase().includes(w))),
        );
      }

      if (filtered.length === 0) {
        const base =
          `No datasets found for "${query}" in [${chosen.join(", ")}]` +
          (topics?.length ? ` matching topics [${topics.join(", ")}]` : "") +
          ".";
        return textResult([base, ...notes].join("\n"));
      }

      const summary =
        `Found ${filtered.length} dataset(s) for "${query}" across [${chosen.join(", ")}].` +
        (notes.length ? `\n${notes.join("\n")}` : "");
      return jsonResult(summary, filtered);
    },
  );
}
