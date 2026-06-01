import { z } from "zod";
import { SourceEnum } from "./source.js";

export const COUNTRY_CODE = "LA" as const;
export const COUNTRY_NAME = "Lao PDR" as const;

/**
 * One observation of one indicator, in one year, for Lao PDR — the unit every
 * time-series adapter (World Bank, UNICEF, ADB, Laosis) normalizes into.
 */
export const IndicatorRecord = z.object({
  /** Globally unique within this server, e.g. "WB:SP.POP.TOTL". */
  id: z.string(),
  source: SourceEnum,
  /** The original code used by the upstream source. */
  indicatorCode: z.string(),
  indicatorName: z.string(),
  /** Coarse topic bucket, e.g. "health", "education", "economy". */
  category: z.string(),
  countryCode: z.literal(COUNTRY_CODE),
  countryName: z.literal(COUNTRY_NAME),
  year: z.number().int().min(1960).max(2030),
  value: z.number().nullable(),
  /** e.g. "%", "USD", "per 1,000". */
  unit: z.string().optional(),
  footnote: z.string().optional(),
  /** ISO 8601 timestamp of when this record was retrieved. */
  retrievedAt: z.iso.datetime(),
});

export type IndicatorRecord = z.infer<typeof IndicatorRecord>;

export const IndicatorRecordArray = z.array(IndicatorRecord);
