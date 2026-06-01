import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError, SourceUnavailableError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.ilostat.baseUrl;

/** Curated key ILOSTAT labour indicators for Lao PDR (codes verified against the SDMX API). */
export const KEY_LABOR_INDICATORS: Array<{ code: string; name: string; key: string }> = [
  {
    code: "DF_EAP_DWAP_SEX_AGE_RT",
    name: "Labour force participation rate (15+, total, %)",
    key: "LAO.A..SEX_T.AGE_YTHADULT_YGE15",
  },
  {
    code: "DF_UNE_DEAP_SEX_AGE_RT",
    name: "Unemployment rate (15+, total, %)",
    key: "LAO.A..SEX_T.AGE_YTHADULT_YGE15",
  },
  {
    code: "DF_EMP_DWAP_SEX_AGE_RT",
    name: "Employment-to-population ratio (15+, total, %)",
    key: "LAO.A..SEX_T.AGE_YTHADULT_YGE15",
  },
  {
    code: "DF_EMP_NIFL_SEX_RT",
    name: "Informal employment rate (total, %)",
    key: "LAO.A..SEX_T",
  },
  {
    code: "DF_EAR_EMTA_SEX_NB",
    name: "Average monthly earnings of employees (LAK)",
    key: "LAO.A..SEX_T",
  },
  {
    code: "DF_EAP_2WAP_SEX_AGE_RT",
    name: "LFPR, ILO modelled estimate (15+, total, %)",
    key: "LAO.A..SEX_T.AGE_YTHADULT_YGE15",
  },
];

// ─── SDMX-JSON 1.0 types (ILO-specific) ──────────────────────────────────────

interface IloSdmxDimensionValue {
  id: string;
  name?: string;
}

interface IloSdmxDimension {
  id: string;
  name?: string;
  values: IloSdmxDimensionValue[];
}

interface IloSdmxAttributeDef {
  id: string;
  values: IloSdmxDimensionValue[];
}

interface IloSdmxSeries {
  /** attribute indices (may be null → index 0) */
  attributes?: Array<number | null>;
  observations: Record<string, Array<number | null>>;
}

interface IloSdmxDataSet {
  series?: Record<string, IloSdmxSeries>;
}

interface IloSdmxMessage {
  data?: {
    dataSets?: IloSdmxDataSet[];
    structure?: {
      name?: string;
      dimensions?: {
        series?: IloSdmxDimension[];
        observation?: IloSdmxDimension[];
      };
      attributes?: {
        series?: IloSdmxAttributeDef[];
        observation?: IloSdmxAttributeDef[];
      };
    };
  };
}

function looksLikeIloSdmx(msg: unknown): msg is IloSdmxMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "data" in msg &&
    typeof (msg as IloSdmxMessage).data === "object"
  );
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────

function resolveUnit(unitMeasureId: string): string {
  if (unitMeasureId === "PT") return "%";
  if (unitMeasureId === "LC") return "LAK";
  if (unitMeasureId === "PS" || unitMeasureId === "NB") return "number";
  return unitMeasureId;
}

// ─── ILO-specific SDMX decoder ───────────────────────────────────────────────

interface DecodedIloObs {
  year: number;
  value: number | null;
  unit: string;
  footnote?: string;
}

function decodeIloSdmx(
  msg: IloSdmxMessage,
  dataflowId: string,
): Array<DecodedIloObs & { indicatorName: string; indicatorCode: string }> {
  const structure = msg.data?.structure;
  if (!structure) throw new DataParseError("ilostat", "missing data.structure");

  const seriesDims = structure.dimensions?.series ?? [];
  const obsDims = structure.dimensions?.observation ?? [];
  const attrDefs = structure.attributes?.series ?? [];
  const dataSet = msg.data?.dataSets?.[0];
  if (!dataSet?.series) return [];

  const timeValues = obsDims[0]?.values ?? [];
  const indicatorName = structure.name ?? dataflowId;

  // Locate attribute indices for UNIT_MEASURE and UNIT_MULT
  const unitMeasureDefIdx = attrDefs.findIndex((a) => a.id === "UNIT_MEASURE");
  const unitMultDefIdx = attrDefs.findIndex((a) => a.id === "UNIT_MULT");

  const out: Array<DecodedIloObs & { indicatorName: string; indicatorCode: string }> = [];

  for (const [seriesKey, series] of Object.entries(dataSet.series)) {
    const idx = seriesKey.split(":").map(Number);

    // Build a map of dimension id → value
    const dims: Record<string, { id: string; name: string }> = {};
    seriesDims.forEach((dim, pos) => {
      const valueIndex = idx[pos];
      if (valueIndex === undefined) return;
      const v = dim.values[valueIndex];
      if (v) dims[dim.id] = { id: v.id, name: v.name ?? v.id };
    });

    // Resolve unit from series attributes
    let unit = "%";
    let mult = 1;
    const seriesAttrs = series.attributes ?? [];

    if (unitMeasureDefIdx >= 0) {
      const attrVal = seriesAttrs[unitMeasureDefIdx];
      // null means use index 0
      const attrIdx = attrVal ?? 0;
      const def = attrDefs[unitMeasureDefIdx];
      const valObj = def?.values[attrIdx];
      if (valObj) unit = resolveUnit(valObj.id);
    }

    if (unitMultDefIdx >= 0) {
      const attrVal = seriesAttrs[unitMultDefIdx];
      const attrIdx = attrVal ?? 0;
      const def = attrDefs[unitMultDefIdx];
      const valObj = def?.values[attrIdx];
      if (valObj?.id === "3") mult = 1000;
    }

    // Build footnote from SEX dimension (skip total)
    const sexDim = dims["SEX"];
    let footnote: string | undefined;
    if (sexDim && sexDim.id !== "SEX_T") {
      footnote = `sex=${sexDim.name}`;
    }

    for (const [obsKey, obsArr] of Object.entries(series.observations)) {
      const time = timeValues[Number(obsKey)];
      if (!time) continue;
      const year = Number(time.id);
      if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
      const raw = Array.isArray(obsArr) ? obsArr[0] : null;
      let value: number | null =
        raw === null || raw === undefined ? null : typeof raw === "number" ? raw : Number(raw);
      if (value !== null && !Number.isFinite(value)) value = null;
      if (value !== null && mult !== 1) value = value * mult;

      out.push({ year, value, unit, footnote, indicatorName, indicatorCode: dataflowId });
    }
  }

  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a single ILOSTAT SDMX indicator for Lao PDR, normalized to IndicatorRecord[].
 * Compatible with registerIndicatorFetcher signature.
 */
export async function fetchIlostatIndicator(
  code: string,
  startYear?: number,
  endYear?: number,
): Promise<IndicatorRecord[]> {
  const c = code.trim();
  const sy = startYear ?? 2000;
  const ey = endYear ?? new Date().getFullYear();

  const indicator = KEY_LABOR_INDICATORS.find((i) => i.code === c);
  const seriesKey = indicator?.key ?? "LAO.A..SEX_T.AGE_YTHADULT_YGE15";

  return cache.getOrSet("ilostat", ["data", c, sy, ey], async () => {
    const url = `${BASE}/data/ILO,${c},1.0/${seriesKey}`;
    let data: IloSdmxMessage;
    try {
      data = await httpGet<IloSdmxMessage>("ilostat", url, {
        params: { startPeriod: sy, endPeriod: ey },
        headers: { Accept: "application/vnd.sdmx.data+json;version=1.0" },
      });
    } catch (err) {
      if (err instanceof SourceUnavailableError && err.reason.includes("HTTP 404")) {
        return [];
      }
      throw err;
    }

    if (!looksLikeIloSdmx(data) || !data.data?.structure) {
      throw new DataParseError("ilostat", JSON.stringify(data).slice(0, 200));
    }

    const observations = decodeIloSdmx(data, c);
    const retrievedAt = new Date().toISOString();
    const records: IndicatorRecord[] = observations
      .filter((o) => o.year >= sy && o.year <= ey)
      .map((o) => ({
        id: `ILO:${c}`,
        source: "ilostat" as const,
        indicatorCode: c,
        indicatorName: o.footnote ? `${o.indicatorName} [${o.footnote}]` : o.indicatorName,
        category: "labor",
        countryCode: COUNTRY_CODE,
        countryName: COUNTRY_NAME,
        year: o.year,
        value: o.value,
        unit: o.unit,
        footnote: o.footnote,
        retrievedAt,
      }));

    records.sort((a, b) => b.year - a.year);
    return records;
  });
}

/** Case-insensitive substring search over KEY_LABOR_INDICATORS, up to 25 results. */
export async function searchIlostatIndicators(
  query: string,
): Promise<Array<{ code: string; name: string }>> {
  const q = query.trim().toLowerCase();
  return KEY_LABOR_INDICATORS.filter(
    (i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q),
  )
    .slice(0, 25)
    .map(({ code, name }) => ({ code, name }));
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingIlostat(): Promise<boolean> {
  try {
    const result = await fetchIlostatIndicator("DF_EAP_DWAP_SEX_AGE_RT");
    return Array.isArray(result);
  } catch {
    return false;
  }
}
