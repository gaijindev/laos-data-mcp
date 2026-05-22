import { DatasetMetadata } from "../schemas/dataset.js";
import { SOURCE_META } from "../schemas/source.js";
import { httpGet } from "../utils/http.js";

const PORTAL = SOURCE_META.mrc.baseUrl;

/**
 * Mekong River Commission (MRC) adapter — STUB.
 *
 * MRC's Data & Information Services Portal requires free registration for raw
 * data, so this exposes a static catalog of available dataset themes (with
 * portal links) and a portal reachability ping. It activates real downloads
 * once MRC_SESSION_TOKEN is provided.
 *
 * TODO(mrc-live): when MRC_SESSION_TOKEN is set, fetch dataset resources from
 * the portal API and normalize them here.
 */

interface MrcCatalogItem {
  slug: string;
  title: string;
  description: string;
  topics: string[];
}

const MRC_CATALOG: MrcCatalogItem[] = [
  {
    slug: "hydrology-water-level",
    title: "Hydrology — water level & discharge (Mekong mainstream)",
    description:
      "Daily/monthly water level and discharge at Mekong mainstream and tributary stations.",
    topics: ["hydrology", "water", "river", "discharge"],
  },
  {
    slug: "flood-drought-forecast",
    title: "Flood & drought forecasting",
    description:
      "Flood season monitoring, forecasts, and drought conditions for the Lower Mekong Basin.",
    topics: ["flood", "drought", "forecast", "water"],
  },
  {
    slug: "fisheries",
    title: "Fisheries — abundance & diversity",
    description: "Fish abundance, diversity, and migration monitoring across the basin.",
    topics: ["fisheries", "ecology", "biodiversity"],
  },
  {
    slug: "sediment",
    title: "Sediment & geomorphology",
    description: "Suspended sediment concentration and load monitoring.",
    topics: ["sediment", "water", "geomorphology"],
  },
  {
    slug: "water-quality",
    title: "Water quality monitoring",
    description: "Physico-chemical water quality parameters at monitoring stations.",
    topics: ["water quality", "environment", "water"],
  },
  {
    slug: "ecological-health",
    title: "Ecological health monitoring",
    description: "Biomonitoring indices of river ecological health.",
    topics: ["ecology", "environment", "biodiversity"],
  },
  {
    slug: "navigation",
    title: "Navigation & waterway",
    description: "Waterway navigation conditions and cross-border transport data.",
    topics: ["navigation", "transport", "river"],
  },
  {
    slug: "hydropower-dams",
    title: "Hydropower & dam operations",
    description: "Mekong mainstream and tributary dam/hydropower information.",
    topics: ["hydropower", "energy", "dams", "water"],
  },
];

export function mrcHasToken(): boolean {
  return Boolean(process.env.MRC_SESSION_TOKEN && process.env.MRC_SESSION_TOKEN.trim().length > 0);
}

/** Search the static MRC dataset catalog (metadata only until auth is provided). */
export function searchMrcCatalog(topic?: string): DatasetMetadata[] {
  const q = topic?.trim().toLowerCase();
  const retrievedAt = new Date().toISOString();
  const items = q
    ? MRC_CATALOG.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.topics.some((t) => t.toLowerCase().includes(q)) ||
          i.description.toLowerCase().includes(q),
      )
    : MRC_CATALOG;
  return items.map((i) =>
    DatasetMetadata.parse({
      id: `mrc:${i.slug}`,
      source: "mrc",
      title: i.title,
      description: i.description,
      topics: i.topics,
      formats: [],
      downloadUrl: `${PORTAL}/`,
      license: "MRC — registration required",
      retrievedAt,
    }),
  );
}

/** Best-effort reachability ping of the MRC portal. */
export async function mrcIsAvailable(): Promise<boolean> {
  try {
    await httpGet<unknown>("mrc", PORTAL, { responseType: "text" });
    return true;
  } catch {
    return false;
  }
}
