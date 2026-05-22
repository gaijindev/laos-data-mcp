import type { DatasetMetadata } from "../schemas/dataset.js";
import { SOURCE_META } from "../schemas/source.js";
import { ckanPackageSearch, ckanPing, type CkanConfig } from "./ckan.js";

const CONFIG: CkanConfig = {
  source: "mekong",
  baseUrl: SOURCE_META.mekong.baseUrl,
};

/** Search the Open Development Mekong (Laos) CKAN catalog. */
export function fetchMekongDatasets(query: string, maxResults = 10): Promise<DatasetMetadata[]> {
  return ckanPackageSearch(CONFIG, query, maxResults);
}

export function pingMekong(): Promise<boolean> {
  return ckanPing(CONFIG);
}
