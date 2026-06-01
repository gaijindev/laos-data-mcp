import { z } from "zod";
import { SourceEnum } from "./source.js";

/**
 * Normalized metadata for a dataset (not a time series) — what the CKAN sources
 * (Open Development Mekong, ADB) return: a catalog entry pointing at downloadable
 * resource files.
 */
export const DatasetMetadata = z.object({
  id: z.string(),
  source: SourceEnum,
  title: z.string(),
  description: z.string().optional(),
  topics: z.array(z.string()),
  /** Resource formats, e.g. ["CSV", "JSON", "XLSX"]. */
  formats: z.array(z.string()),
  downloadUrl: z.url().optional(),
  /** Free-form upstream timestamp string (formats vary by source). */
  lastUpdated: z.string().optional(),
  license: z.string().optional(),
  retrievedAt: z.iso.datetime(),
});

export type DatasetMetadata = z.infer<typeof DatasetMetadata>;

export const DatasetMetadataArray = z.array(DatasetMetadata);
