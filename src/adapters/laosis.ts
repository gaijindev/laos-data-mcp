import { SOURCE_META } from "../schemas/source.js";
import { httpGet } from "../utils/http.js";

/**
 * Lao Statistics Bureau (Laosis) adapter — STUB.
 *
 * Laosis (https://laosis.lsb.gov.la) has no documented public REST API. This
 * adapter therefore exposes:
 *   - the known statistical categories (so the data is discoverable), and
 *   - a reachability ping for get_source_status,
 * and activates real calls only once an API is documented and LAOSIS_API_KEY is
 * provided. See README for how to request access from LSB.
 *
 * TODO(laosis-live): when LSB exposes an API, implement search/fetch here,
 * gated behind laosisHasApiKey(), and normalize results to IndicatorRecord[].
 */

/** Known Laosis statistical categories (LSB publishes data under these areas). */
export const LAOSIS_CATEGORIES = [
  "Population and Housing",
  "Demography and Migration",
  "Labour and Employment",
  "National Accounts (GDP)",
  "Prices and Inflation (CPI)",
  "Agriculture, Forestry and Fishery",
  "Industry and Handicraft",
  "Construction",
  "Energy and Mining",
  "Trade (Domestic and International)",
  "Transport and Logistics",
  "Information and Communication",
  "Tourism",
  "Money, Banking and Finance",
  "Government Finance and Budget",
  "Investment",
  "Education",
  "Health and Nutrition",
  "Social Welfare and Poverty",
  "Gender and Children",
  "Environment and Climate",
  "Water, Sanitation and Hygiene",
  "Justice and Governance",
  "Sustainable Development Goals (SDGs)",
] as const;

export function getLaosisCategories(): readonly string[] {
  return LAOSIS_CATEGORIES;
}

/** True when a LAOSIS_API_KEY is configured (does not imply a working API). */
export function laosisHasApiKey(): boolean {
  return Boolean(process.env.LAOSIS_API_KEY && process.env.LAOSIS_API_KEY.trim().length > 0);
}

/** Best-effort reachability ping of the Laosis site (not the absent API). */
export async function laosisIsAvailable(): Promise<boolean> {
  try {
    await httpGet<unknown>("laosis", SOURCE_META.laosis.baseUrl, { responseType: "text" });
    return true;
  } catch {
    return false;
  }
}
