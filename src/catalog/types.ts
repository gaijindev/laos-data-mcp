import { z } from "zod";
import { SourceEnum } from "../schemas/source.js";

/** Coarse topic buckets used to organize and filter the catalog. */
export const CATEGORIES = [
  "demography",
  "economy",
  "poverty",
  "education",
  "health",
  "nutrition",
  "gender",
  "wash",
  "environment",
  "agriculture",
  "energy",
  "infrastructure",
  "technology",
  "trade",
  "governance",
  "labor",
] as const;

export const CategoryEnum = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategoryEnum>;

/**
 * A discoverable indicator definition (NOT an observation). The catalog is a
 * curated map of "what can I ask for" that list_available_indicators serves and
 * get_laos_indicator uses to resolve a code to its source.
 */
export const CatalogEntry = z.object({
  /** Server-wide id, e.g. "WB:SP.POP.TOTL" or "UNICEF:NUTRITION:NT_ANT_HAZ_NE2". */
  id: z.string(),
  source: SourceEnum,
  /** Upstream code used to actually fetch the data. */
  code: z.string(),
  name: z.string(),
  category: CategoryEnum,
  unit: z.string().optional(),
  description: z.string().optional(),
  /** UNICEF only: the SDMX dataflow id this indicator lives in. */
  dataflow: z.string().optional(),
});

export type CatalogEntry = z.infer<typeof CatalogEntry>;
