import type { DatasetMetadata } from "../schemas/dataset.js";
import { SOURCE_META } from "../schemas/source.js";
import { ckanPackageSearch, ckanPing, type CkanConfig } from "./ckan.js";

const CONFIG: CkanConfig = {
  source: "adb",
  baseUrl: SOURCE_META.adb.baseUrl,
};

/**
 * Search the ADB Data Library CKAN catalog, scoped toward Lao PDR.
 *
 * NOTE: data.adb.org sits behind a Cloudflare bot challenge, so this typically
 * raises SourceUnavailableError from non-browser clients. ckanPackageSearch
 * detects the challenge HTML and degrades gracefully; ADB is best-effort.
 */
export function fetchAdbDatasets(query: string, maxResults = 10): Promise<DatasetMetadata[]> {
  // Bias ADB's global catalog toward Laos when the user query is broad.
  const scoped = /\b(lao|laos|lao pdr)\b/i.test(query) ? query : `${query} lao`;
  return ckanPackageSearch(CONFIG, scoped, maxResults);
}

export function pingAdb(): Promise<boolean> {
  return ckanPing(CONFIG);
}
