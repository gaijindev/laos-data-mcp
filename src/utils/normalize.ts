import type { IndicatorRecord } from "../schemas/indicator.js";
import type { Source } from "../schemas/source.js";

export interface ComparisonSeriesInput {
  label: string;
  source: Source;
  code: string;
  indicatorName: string;
  unit?: string;
  records: IndicatorRecord[];
}

export interface ComparisonSeries {
  label: string;
  source: Source;
  code: string;
  indicatorName: string;
  unit?: string;
  /** year -> value (null = year present in another series but missing here). */
  values: Record<number, number | null>;
}

export interface ComparisonResult {
  startYear: number;
  endYear: number;
  years: number[];
  series: ComparisonSeries[];
}

/**
 * Align several indicator series onto a shared, sorted set of years within
 * [startYear, endYear]. On a year collision within one series (e.g. multiple
 * age breakdowns), the first non-null value wins.
 */
export function buildComparison(
  inputs: ComparisonSeriesInput[],
  startYear: number,
  endYear: number,
): ComparisonResult {
  const yearSet = new Set<number>();
  const series: ComparisonSeries[] = inputs.map((input) => {
    const values: Record<number, number | null> = {};
    for (const r of input.records) {
      if (r.year < startYear || r.year > endYear) continue;
      yearSet.add(r.year);
      const existing = values[r.year];
      if (existing === undefined || (existing === null && r.value !== null)) {
        values[r.year] = r.value;
      }
    }
    return {
      label: input.label,
      source: input.source,
      code: input.code,
      indicatorName: input.indicatorName,
      unit: input.unit,
      values,
    };
  });
  const years = [...yearSet].sort((a, b) => a - b);
  return { startYear, endYear, years, series };
}

function formatValue(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  return (Math.round(v * 100) / 100).toLocaleString("en-US");
}

function columnHeader(s: ComparisonSeries): string {
  return s.unit ? `${s.label} (${s.unit})` : s.label;
}

export function toMarkdownTable(result: ComparisonResult): string {
  if (result.years.length === 0) return "_No overlapping years with data._";
  const cols = result.series.map(columnHeader);
  const head = `| Year | ${cols.join(" | ")} |`;
  const sep = `| --- | ${cols.map(() => "---").join(" | ")} |`;
  const rows = result.years.map(
    (y) => `| ${y} | ${result.series.map((s) => formatValue(s.values[y])).join(" | ")} |`,
  );
  return [head, sep, ...rows].join("\n");
}

export function toPlainTable(result: ComparisonResult): string {
  if (result.years.length === 0) return "No overlapping years with data.";
  const headers = ["Year", ...result.series.map(columnHeader)];
  const rows = result.years.map((y) => [
    String(y),
    ...result.series.map((s) => formatValue(s.values[y])),
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const renderRow = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join("  ");
  return [
    renderRow(headers),
    renderRow(widths.map((w) => "-".repeat(w))),
    ...rows.map(renderRow),
  ].join("\n");
}
