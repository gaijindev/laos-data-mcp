import { cache } from "../cache/manager.js";
import type { DatasetMetadata } from "../schemas/dataset.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpPost } from "../utils/http.js";

const BASE = SOURCE_META.faolex.baseUrl;
const SEARCH_APPLICATION_ID = "searchapplications/1be285f8874b8c6bfaabf84aa9d0c1be";
const FAOLEX_PDF_BASE = "https://faolex.fao.org/docs/pdf";

export const FAOLEX_TYPES = ["all", "legislation", "regulation", "policy", "agreement"] as const;
export type FaolexType = (typeof FAOLEX_TYPES)[number];

interface FaolexTextValues {
  values?: string[];
}

interface FaolexField {
  name?: string;
  textValues?: FaolexTextValues;
  integerValues?: { values?: number[] };
}

interface FaolexResult {
  title?: string;
  url?: string;
  snippet?: { snippet?: string };
  metadata?: {
    mimeType?: string;
    fields?: FaolexField[];
  };
}

interface FaolexResponse {
  resultCountExact?: string;
  results?: FaolexResult[];
}

function sanitizeQuery(query: string): string {
  return query
    .replace(/country\s*:\s*\(?\s*"?[A-Za-z]{2,3}"?\s*\)?/gi, " ")
    .replace(/[():"{}[\]^~*?\\/+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function typeFilter(type: FaolexType): string | undefined {
  const label: Record<Exclude<FaolexType, "all">, string> = {
    legislation: "Legislation",
    regulation: "Regulation",
    policy: "Policy",
    agreement: "Agreement",
  };
  return type === "all" ? undefined : `typeOfTextEn:("${label[type]}")`;
}

function buildFaolexQuery(query: string, type: FaolexType): string {
  const parts = ['country:("LAO")'];
  const filter = typeFilter(type);
  if (filter) parts.push(filter);
  const cleaned = sanitizeQuery(query);
  if (cleaned) parts.push(cleaned);
  return parts.join(" ");
}

function fieldValues(fields: FaolexField[], name: string): string[] {
  const field = fields.find((item) => item.name === name);
  const values = field?.textValues?.values ?? [];
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function firstField(fields: FaolexField[], names: string[]): string | undefined {
  for (const name of names) {
    const value = fieldValues(fields, name)[0];
    if (value) return value;
  }
  return undefined;
}

function english(value: string): string {
  return value.split("#")[0]?.trim() ?? value.trim();
}

function fieldEnglishValues(fields: FaolexField[], name: string): string[] {
  return fieldValues(fields, name)
    .map(english)
    .filter((value) => value.length > 0);
}

function unique(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value?.trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    result.push(clean);
  }
  return result;
}

function fullTextUrl(fields: FaolexField[], fallback?: string): string | undefined {
  const link = firstField(fields, ["linksToFullText", "fullText", "internetReference"]);
  if (link?.startsWith("http://") || link?.startsWith("https://")) return link;
  if (link?.toLowerCase().endsWith(".pdf")) return `${FAOLEX_PDF_BASE}/${link}`;
  if (fallback?.startsWith("http://") || fallback?.startsWith("https://")) return fallback;
  return undefined;
}

function formatFor(result: FaolexResult, downloadUrl?: string): string[] {
  const formats = new Set<string>();
  const mime = result.metadata?.mimeType;
  if (mime?.includes("pdf")) formats.add("PDF");
  if (mime?.includes("html")) formats.add("HTML");
  const extension = downloadUrl?.split(/[?#]/)[0]?.split(".").pop()?.toUpperCase();
  if (extension && extension.length <= 5) formats.add(extension);
  if (formats.size === 0) formats.add("HTML");
  return [...formats];
}

function normalizeResult(result: FaolexResult, retrievedAt: string): DatasetMetadata | null {
  const fields = result.metadata?.fields;
  if (!Array.isArray(fields)) return null;

  const faolexId = firstField(fields, ["faolexId", "isisMfn"]);
  const title = firstField(fields, ["titleOfText", "longTitleOfText", "originalTitleOfText"]);
  if (!faolexId || !title) return null;

  const downloadUrl = fullTextUrl(fields, result.url);
  const topics = unique([
    ...fieldEnglishValues(fields, "typeOfTextEn"),
    ...fieldEnglishValues(fields, "mainAreaEn"),
    ...fieldEnglishValues(fields, "mainClassifyingKeywordEn"),
    ...fieldEnglishValues(fields, "subjectSelectionEn"),
    ...fieldEnglishValues(fields, "keywordEn"),
    ...fieldEnglishValues(fields, "rightsFood").map(() => "right to food"),
    ...fieldEnglishValues(fields, "rightsWater").map(() => "right to water"),
    ...fieldEnglishValues(fields, "rightsEnvironmental").map(() => "environmental rights"),
  ]);
  const abstract = fieldValues(fields, "abstract").map(english).join(" ");
  const comment = fieldValues(fields, "comment").map(english).join(" ");
  const snippet = result.snippet?.snippet?.trim();
  const description = unique([abstract, comment, snippet]).join("\n\n") || undefined;
  const lastUpdated = firstField(fields, ["dateOfModification", "dateOfText", "year"]);

  return {
    id: `faolex:${faolexId}`,
    source: "faolex",
    title,
    description,
    topics,
    formats: formatFor(result, downloadUrl),
    downloadUrl,
    lastUpdated,
    license: "FAOLEX legal database; verify reuse terms with FAOLEX for downstream publication",
    retrievedAt,
  };
}

async function queryFaolex(query: string, maxResults: number): Promise<FaolexResponse> {
  const body = JSON.stringify({
    query,
    requestOptions: { searchApplicationId: SEARCH_APPLICATION_ID },
    start: 0,
    pageSize: maxResults,
  });
  const data = await httpPost<FaolexResponse>("faolex", BASE, body, {
    headers: { "Content-Type": "text/plain" },
  });
  if (!data || typeof data !== "object" || !Array.isArray(data.results)) {
    throw new DataParseError("faolex", JSON.stringify(data).slice(0, 200));
  }
  return data;
}

/** Search FAOLEX legal/policy texts scoped to Lao PDR. */
export function searchFaolexLegalTexts(
  query = "",
  type: FaolexType = "all",
  maxResults = 10,
): Promise<DatasetMetadata[]> {
  const max = Math.min(Math.max(maxResults, 1), 50);
  const t = FAOLEX_TYPES.includes(type) ? type : "all";
  const faolexQuery = buildFaolexQuery(query, t);

  return cache.getOrSet("faolex", ["search", faolexQuery, max], async () => {
    const data = await queryFaolex(faolexQuery, max);
    const retrievedAt = new Date().toISOString();
    return (
      data.results
        ?.map((result) => normalizeResult(result, retrievedAt))
        .filter((result): result is DatasetMetadata => result !== null)
        .slice(0, max) ?? []
    );
  });
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingFaolex(): Promise<boolean> {
  try {
    const data = await queryFaolex(buildFaolexQuery("", "all"), 1);
    return Array.isArray(data.results);
  } catch {
    return false;
  }
}
