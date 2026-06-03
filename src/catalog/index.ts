import type { Source } from "../schemas/source.js";
import { SEED_CATALOG } from "./seed.js";
import type { CatalogEntry } from "./types.js";

export { CATEGORIES, CategoryEnum } from "./types.js";
export type { CatalogEntry, Category } from "./types.js";

/** The full curated catalog of discoverable indicators. */
export function getCatalog(): CatalogEntry[] {
  return SEED_CATALOG;
}

/**
 * Find an entry by server id ("WB:SP.POP.TOTL"), upstream code ("SP.POP.TOTL"),
 * or "SOURCE:CODE", case-insensitively.
 */
export function findCatalogEntry(needle: string): CatalogEntry | undefined {
  const n = needle.trim().toLowerCase();
  return SEED_CATALOG.find((e) => e.id.toLowerCase() === n || e.code.toLowerCase() === n);
}

export interface CatalogFilter {
  source?: Source | "all";
  category?: string;
  search?: string;
}

export function filterCatalog(filter: CatalogFilter = {}): CatalogEntry[] {
  let entries = getCatalog();
  if (filter.source && filter.source !== "all") {
    entries = entries.filter((e) => e.source === filter.source);
  }
  if (filter.category) {
    const c = filter.category.trim().toLowerCase();
    entries = entries.filter((e) => e.category === c);
  }
  if (filter.search) {
    const q = filter.search.trim().toLowerCase();
    entries = entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q),
    );
  }
  return entries;
}
