/**
 * SDMX-JSON (1.0) helpers.
 *
 * UNICEF returns data as `data.dataSets[0].series`, where each series is keyed
 * by a colon-joined string of *dimension value indices* (e.g. "0:1:1:2:0:0:0:0").
 * Each index points into `data.structure.dimensions.series[pos].values[index]`.
 * Observations are keyed by an index into the TIME_PERIOD value list (which is
 * NOT sorted), and each observation is an array whose first element is the value.
 */

export interface SdmxDimensionValue {
  id: string;
  name?: string;
}

export interface SdmxDimension {
  id: string;
  name?: string;
  values: SdmxDimensionValue[];
}

export interface SdmxStructure {
  dimensions: {
    series: SdmxDimension[];
    observation: SdmxDimension[];
  };
}

export interface SdmxSeries {
  attributes?: Array<number | null>;
  observations: Record<string, Array<string | number | null>>;
}

export interface SdmxDataSet {
  series?: Record<string, SdmxSeries>;
}

export interface SdmxMessage {
  data?: {
    dataSets?: SdmxDataSet[];
    structure?: SdmxStructure;
  };
  structure?: SdmxStructure;
}

export interface DecodedObservation {
  indicatorCode: string;
  indicatorName: string;
  year: number;
  value: number | null;
  /** All series dimensions for this point, keyed by dimension id (e.g. SEX). */
  dimensions: Record<string, { id: string; name: string }>;
}

/** True if the payload at least looks like an SDMX message (vs. an error page). */
export function looksLikeSdmx(message: unknown): message is SdmxMessage {
  return (
    typeof message === "object" && message !== null && ("data" in message || "structure" in message)
  );
}

/** Decode an SDMX-JSON message into flat observations. Returns [] if empty. */
export function decodeSdmxJson(message: SdmxMessage): DecodedObservation[] {
  const structure = message.data?.structure ?? message.structure;
  const seriesDims = structure?.dimensions?.series;
  const obsDims = structure?.dimensions?.observation;
  const dataSet = message.data?.dataSets?.[0];
  if (!structure || !seriesDims || !obsDims || !dataSet?.series) return [];

  const timeValues = obsDims[0]?.values ?? [];
  const out: DecodedObservation[] = [];

  for (const [seriesKey, series] of Object.entries(dataSet.series)) {
    const idx = seriesKey.split(":").map((n) => Number(n));
    const dimensions: Record<string, { id: string; name: string }> = {};
    seriesDims.forEach((dim, pos) => {
      const valueIndex = idx[pos];
      if (valueIndex === undefined) return;
      const v = dim.values[valueIndex];
      if (v) dimensions[dim.id] = { id: v.id, name: v.name ?? v.id };
    });

    const indicator = dimensions["INDICATOR"];
    if (!indicator) continue;

    for (const [obsKey, obsArr] of Object.entries(series.observations)) {
      const time = timeValues[Number(obsKey)];
      if (!time) continue;
      const year = Number(time.id);
      if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
      const raw = Array.isArray(obsArr) ? obsArr[0] : null;
      const num = raw === null || raw === undefined ? null : Number(raw);
      out.push({
        indicatorCode: indicator.id,
        indicatorName: indicator.name,
        year,
        value: num === null || Number.isNaN(num) ? null : num,
        dimensions,
      });
    }
  }
  return out;
}
