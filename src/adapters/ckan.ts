import { cache } from "../cache/manager.js";
import { DatasetMetadata } from "../schemas/dataset.js";
import type { Source } from "../schemas/source.js";
import { DataParseError, SourceUnavailableError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

interface CkanResource {
  format?: string;
  url?: string;
  name?: string;
}

interface CkanPackage {
  id?: string;
  name?: string;
  title?: string;
  notes?: string;
  title_translated?: Record<string, string>;
  notes_translated?: Record<string, string>;
  tags?: Array<{ name?: string; display_name?: string }>;
  groups?: Array<{ name?: string; title?: string }>;
  resources?: CkanResource[];
  metadata_modified?: string;
  license_title?: string | null;
  license_id?: string | null;
}

interface CkanSearchResponse {
  success?: boolean;
  result?: { count?: number; results?: CkanPackage[] };
}

export interface CkanConfig {
  source: Source;
  /** CKAN action API base, e.g. https://host/api/3/action */
  baseUrl: string;
}

function sitePrefix(cfg: CkanConfig): string {
  return cfg.baseUrl.replace(/\/api\/3\/action\/?$/, "");
}

/** Prefer English from a CKAN *_translated map, then any non-empty value, then fallback. */
function pickText(
  translated: Record<string, string> | undefined,
  fallback: string | undefined,
): string | undefined {
  if (translated && typeof translated === "object") {
    const en = translated.en;
    if (en) return en;
    const any = Object.values(translated).find((v) => typeof v === "string" && v.length > 0);
    if (any) return any;
  }
  return fallback;
}

function isHttpUrl(u: unknown): u is string {
  return typeof u === "string" && /^https?:\/\//.test(u);
}

function toRawDataset(pkg: CkanPackage, cfg: CkanConfig, retrievedAt: string): unknown {
  const title = pickText(pkg.title_translated, pkg.title) ?? pkg.name ?? pkg.id ?? "(untitled)";
  const description = pickText(pkg.notes_translated, pkg.notes);
  const tagNames = (pkg.tags ?? [])
    .map((t) => t.display_name || t.name)
    .filter((x): x is string => Boolean(x));
  const groupNames = (pkg.groups ?? [])
    .map((g) => g.title || g.name)
    .filter((x): x is string => Boolean(x));
  const topics = [...new Set([...tagNames, ...groupNames])];
  const formats = [
    ...new Set(
      (pkg.resources ?? [])
        .map((r) => (r.format ?? "").trim().toUpperCase())
        .filter((f) => f.length > 0),
    ),
  ];
  const firstUrl = (pkg.resources ?? []).map((r) => r.url).find(isHttpUrl);
  const pageUrl = pkg.name ? `${sitePrefix(cfg)}/dataset/${pkg.name}` : undefined;
  const downloadUrl = firstUrl ?? (isHttpUrl(pageUrl) ? pageUrl : undefined);

  return {
    id: `${cfg.source}:${pkg.name ?? pkg.id ?? title}`,
    source: cfg.source,
    title,
    description,
    topics,
    formats,
    downloadUrl,
    lastUpdated: pkg.metadata_modified,
    license: pkg.license_title ?? pkg.license_id ?? undefined,
    retrievedAt,
  };
}

/** Detects a Cloudflare / bot-challenge HTML interstitial in place of JSON. */
function detectChallenge(source: Source, data: unknown): void {
  if (typeof data !== "string") return;
  const lower = data.toLowerCase();
  if (
    lower.includes("just a moment") ||
    lower.includes("cloudflare") ||
    lower.includes("<!doctype html")
  ) {
    throw new SourceUnavailableError(
      source,
      "blocked by a bot-protection challenge (the CKAN JSON API is not reachable from non-browser clients)",
    );
  }
  throw new DataParseError(source, data.slice(0, 200));
}

/** Search a CKAN catalog and normalize results to DatasetMetadata[]. Cached. */
export async function ckanPackageSearch(
  cfg: CkanConfig,
  query: string,
  maxResults: number,
): Promise<DatasetMetadata[]> {
  return cache.getOrSet(cfg.source, ["search", query, maxResults], async () => {
    const url = `${cfg.baseUrl}/package_search`;
    const data = await httpGet<unknown>(cfg.source, url, {
      params: { q: query, rows: maxResults },
    });
    if (typeof data === "string") detectChallenge(cfg.source, data);

    const resp = data as CkanSearchResponse;
    if (!resp || typeof resp !== "object" || resp.success !== true || !resp.result) {
      throw new DataParseError(cfg.source, JSON.stringify(resp).slice(0, 200));
    }

    const retrievedAt = new Date().toISOString();
    const out: DatasetMetadata[] = [];
    for (const pkg of resp.result.results ?? []) {
      const parsed = DatasetMetadata.safeParse(toRawDataset(pkg, cfg, retrievedAt));
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  });
}

/** Lightweight reachability probe used by get_source_status. */
export async function ckanPing(cfg: CkanConfig): Promise<boolean> {
  try {
    const data = await httpGet<unknown>(cfg.source, `${cfg.baseUrl}/package_search`, {
      params: { rows: 0 },
    });
    return (
      typeof data === "object" && data !== null && (data as CkanSearchResponse).success === true
    );
  } catch {
    return false;
  }
}
