import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError, SourceUnavailableError } from "../utils/errors.js";
import { httpGet, httpPost } from "../utils/http.js";

const BASE = SOURCE_META.wfp.baseUrl;
const TOKEN_URL = "https://api.wfp.org/token";
const REFRESH_BUFFER_MS = 60_000; // refresh a minute before expiry

interface TokenState {
  token: string;
  expiresAt: number;
}
let tokenState: TokenState | null = null;

/** Test seam: clear the cached OAuth token. */
export function resetWfpToken(): void {
  tokenState = null;
}

function credentials(): { id: string; secret: string } | null {
  const id = process.env.WFP_CLIENT_ID?.trim();
  const secret = process.env.WFP_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

/**
 * Get a valid OAuth2 bearer token via client-credentials, refreshing it when
 * expired (WFP tokens last ~1h). Throws SourceUnavailableError without creds.
 */
async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenState && now < tokenState.expiresAt - REFRESH_BUFFER_MS) {
    return tokenState.token;
  }
  const creds = credentials();
  if (!creds) {
    throw new SourceUnavailableError(
      "wfp",
      "WFP VAM needs OAuth2 credentials. Set WFP_CLIENT_ID and WFP_CLIENT_SECRET (register at https://api.wfp.org/).",
    );
  }
  const basic = Buffer.from(`${creds.id}:${creds.secret}`).toString("base64");
  const data = await httpPost<TokenResponse>(
    "wfp",
    TOKEN_URL,
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  if (!data || typeof data.access_token !== "string") {
    throw new SourceUnavailableError(
      "wfp",
      "OAuth token response did not include an access_token.",
    );
  }
  tokenState = {
    token: data.access_token,
    expiresAt: now + (typeof data.expires_in === "number" ? data.expires_in : 3600) * 1000,
  };
  return tokenState.token;
}

type WfpRow = Record<string, unknown>;

function str(row: WfpRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return undefined;
}

function num(row: WfpRow, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

/** Extract a 4-digit year from explicit year fields or a date string. */
function yearOf(row: WfpRow): number | null {
  const y = num(row, "year", "Year", "commodityPriceYear");
  if (y !== null && Number.isInteger(y)) return y;
  const date = str(row, "priceDate", "date", "Date", "month");
  if (date) {
    const m = /(\d{4})/.exec(date);
    if (m) return Number(m[1]);
  }
  return null;
}

function asRows(data: unknown): WfpRow[] | null {
  if (Array.isArray(data)) return data as WfpRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const k of ["items", "data", "result", "records"]) {
      if (Array.isArray(obj[k])) return obj[k] as WfpRow[];
    }
  }
  return null;
}

export interface FoodPriceQuery {
  commodity?: string;
  market?: string;
  startDate?: string;
  endDate?: string;
}

/** Fetch WFP monthly market prices for Lao PDR, normalized to IndicatorRecord[]. */
export async function fetchWfpFoodPrices(query: FoodPriceQuery = {}): Promise<IndicatorRecord[]> {
  const { commodity, market, startDate, endDate } = query;
  return cache.getOrSet(
    "wfp",
    ["prices", commodity ?? "", market ?? "", startDate ?? "", endDate ?? ""],
    async () => {
      const token = await getToken();
      const params: Record<string, string> = { CountryCode: "LAO" };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await httpGet<unknown>("wfp", `${BASE}/MarketPrices/PriceMonthly`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = asRows(data);
      if (rows === null) {
        throw new DataParseError("wfp", JSON.stringify(data).slice(0, 200));
      }
      const retrievedAt = new Date().toISOString();
      const records: IndicatorRecord[] = [];
      for (const row of rows) {
        const year = yearOf(row);
        if (year === null || year < 1960 || year > 2030) continue;
        const commodityName =
          str(row, "commodityName", "CommodityName", "commodity") ?? "Commodity";
        const marketName = str(row, "marketName", "MarketName", "market") ?? "";
        if (commodity && !commodityName.toLowerCase().includes(commodity.toLowerCase())) continue;
        if (market && !marketName.toLowerCase().includes(market.toLowerCase())) continue;
        const currency = str(row, "currencyName", "currency", "Currency");
        const measure = str(row, "commodityUnitName", "unit", "Unit");
        const month = str(row, "month", "Month", "priceDate", "date");
        const labelParts = [commodityName, marketName].filter(Boolean);
        const footnoteParts = [
          marketName && `market=${marketName}`,
          month && `period=${month}`,
        ].filter(Boolean) as string[];
        records.push({
          id: `WFP:price:${commodityName}`,
          source: "wfp",
          indicatorCode: `WFP:PriceMonthly:${commodityName}`,
          indicatorName: `Market price — ${labelParts.join(" @ ")}`,
          category: "economy",
          countryCode: COUNTRY_CODE,
          countryName: COUNTRY_NAME,
          year,
          value: num(row, "price", "Price", "priceValue", "value"),
          unit: currency && measure ? `${currency}/${measure}` : (currency ?? measure),
          footnote: footnoteParts.length ? footnoteParts.join("; ") : undefined,
          retrievedAt,
        });
      }
      records.sort((a, b) => b.year - a.year);
      return records;
    },
  );
}

/** Reachability probe: true only when credentials yield a token. */
export async function pingWfp(): Promise<boolean> {
  if (!credentials()) return false;
  try {
    await getToken();
    return true;
  } catch {
    return false;
  }
}
