import { cache } from "../cache/manager.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet, httpPost } from "../utils/http.js";

const INTERPRETER = SOURCE_META.osm.baseUrl;
const STATUS_URL = "https://overpass-api.de/api/status";
const DEFAULT_LIMIT = 200;
const OVERPASS_HEADERS = {
  "Accept-Encoding": "gzip, deflate",
};
const OVERPASS_FORM_HEADERS = {
  ...OVERPASS_HEADERS,
  "Content-Type": "application/x-www-form-urlencoded",
};

/**
 * Allowed feature types -> fixed Overpass tag selectors. Only these pre-built
 * templates are used; raw Overpass QL from callers is never accepted.
 */
const FEATURE_SELECTORS = {
  hospital: '["amenity"="hospital"]',
  clinic: '["amenity"="clinic"]',
  school: '["amenity"="school"]',
  market: '["amenity"="marketplace"]',
  power_plant: '["power"="plant"]',
  river: '["waterway"="river"]',
} as const;

export type OsmFeatureType = keyof typeof FEATURE_SELECTORS;
export const OSM_FEATURE_TYPES = Object.keys(FEATURE_SELECTORS) as OsmFeatureType[];

export interface OsmFeature {
  id: number;
  osmType: string;
  name?: string;
  lat: number;
  lon: number;
}

export interface InfrastructureResult {
  featureType: OsmFeatureType;
  area: string;
  count: number;
  capped: boolean;
  features: OsmFeature[];
}

/** Strip anything that could break out of the Overpass regex string literal. */
function sanitizeProvince(province: string): string {
  return province
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .slice(0, 60);
}

function buildQuery(selector: string, province: string | undefined, limit: number): string {
  const areaClause = province
    ? `area["admin_level"="4"]["name"~"${sanitizeProvince(province)}",i]->.searchArea;`
    : `area["ISO3166-1"="LA"]->.searchArea;`;
  return (
    `[out:json][timeout:25];${areaClause}` +
    `(node${selector}(area.searchArea);way${selector}(area.searchArea);rel${selector}(area.searchArea););` +
    `out center ${limit};`
  );
}

interface OsmElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements?: OsmElement[];
}

/**
 * Query OpenStreetMap (Overpass) for a fixed infrastructure feature type in Lao
 * PDR (optionally within a province). Heavily cached (7d) to respect Overpass's
 * 10k/day limit. Returns a normalized count + capped feature list.
 */
export async function fetchOsmInfrastructure(
  featureType: OsmFeatureType,
  province?: string,
  limit = DEFAULT_LIMIT,
): Promise<InfrastructureResult> {
  const prov = province?.trim() || undefined;
  return cache.getOrSet("osm", ["infra", featureType, prov ?? "", limit], async () => {
    const query = buildQuery(FEATURE_SELECTORS[featureType], prov, limit);
    const data = await httpPost<OverpassResponse>(
      "osm",
      INTERPRETER,
      new URLSearchParams({ data: query }),
      { headers: OVERPASS_FORM_HEADERS },
    );
    if (!data || typeof data !== "object" || !Array.isArray(data.elements)) {
      throw new DataParseError("osm", JSON.stringify(data).slice(0, 200));
    }
    const features: OsmFeature[] = [];
    for (const el of data.elements) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (typeof lat !== "number" || typeof lon !== "number" || el.id === undefined) continue;
      features.push({
        id: el.id,
        osmType: el.type ?? "node",
        name: el.tags?.name ?? el.tags?.["name:en"],
        lat,
        lon,
      });
    }
    return {
      featureType,
      area: prov ?? "Lao PDR",
      count: features.length,
      capped: features.length >= limit,
      features,
    };
  });
}

/** Reachability probe via the Overpass status endpoint. */
export async function pingOsm(): Promise<boolean> {
  try {
    const status = await httpGet<unknown>("osm", STATUS_URL, {
      headers: OVERPASS_HEADERS,
      responseType: "text",
    });
    return typeof status === "string" && status.length > 0;
  } catch {
    return false;
  }
}
