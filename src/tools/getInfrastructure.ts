import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchOsmInfrastructure, OSM_FEATURE_TYPES, type OsmFeatureType } from "../adapters/osm.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult } from "../utils/result.js";

const DESCRIPTION =
  "Find infrastructure in Lao PDR from OpenStreetMap (via Overpass): hospitals, clinics, " +
  "schools, marketplaces, power plants, or rivers. Optionally restrict to a province. " +
  "Returns a count and located features. Uses fixed query templates (no raw Overpass QL).";

export function registerGetInfrastructureTool(server: McpServer): void {
  server.registerTool(
    "get_laos_infrastructure",
    {
      title: "Get Laos infrastructure (OpenStreetMap)",
      description: DESCRIPTION,
      inputSchema: {
        featureType: z
          .enum(OSM_FEATURE_TYPES as [OsmFeatureType, ...OsmFeatureType[]])
          .describe(`Feature type. One of: ${OSM_FEATURE_TYPES.join(", ")}.`),
        province: z.string().optional().describe('Optional province name (e.g. "Vientiane").'),
      },
    },
    async ({ featureType, province }) => {
      try {
        const result = await fetchOsmInfrastructure(featureType, province);
        return jsonResult(
          `Found ${result.count}${result.capped ? "+" : ""} ${featureType} feature(s) in ${result.area} (OpenStreetMap).`,
          result,
        );
      } catch (err) {
        return toToolError(err, { subject: `OSM ${featureType}` });
      }
    },
  );
}
