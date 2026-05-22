import { describe, it, expect } from "vitest";
import {
  buildComparison,
  toMarkdownTable,
  toPlainTable,
  type ComparisonSeriesInput,
} from "../../src/utils/normalize.js";
import type { IndicatorRecord } from "../../src/schemas/indicator.js";

function rec(year: number, value: number | null): IndicatorRecord {
  return { year, value } as unknown as IndicatorRecord;
}

const population: ComparisonSeriesInput = {
  label: "Population",
  source: "worldbank",
  code: "SP.POP.TOTL",
  indicatorName: "Population, total",
  unit: "people",
  records: [rec(2010, 6), rec(2011, 7)],
};

const gdp: ComparisonSeriesInput = {
  label: "GDP",
  source: "worldbank",
  code: "NY.GDP.MKTP.CD",
  indicatorName: "GDP",
  unit: "USD",
  records: [rec(2011, 100), rec(2012, 110)],
};

describe("buildComparison", () => {
  it("aligns series onto a sorted union of years within range", () => {
    const result = buildComparison([population, gdp], 2010, 2012);
    expect(result.years).toEqual([2010, 2011, 2012]);
    expect(result.series[0]?.values).toEqual({ 2010: 6, 2011: 7 });
    expect(result.series[1]?.values).toEqual({ 2011: 100, 2012: 110 });
  });

  it("excludes years outside the requested range", () => {
    const result = buildComparison([population], 2011, 2011);
    expect(result.years).toEqual([2011]);
    expect(result.series[0]?.values).toEqual({ 2011: 7 });
  });

  it("keeps the first non-null value on a year collision", () => {
    const series: ComparisonSeriesInput = {
      ...population,
      records: [rec(2010, null), rec(2010, 33.1)],
    };
    const result = buildComparison([series], 2000, 2020);
    expect(result.series[0]?.values[2010]).toBe(33.1);
  });
});

describe("table renderers", () => {
  it("renders a markdown table with units and em-dash for gaps", () => {
    const md = toMarkdownTable(buildComparison([population, gdp], 2010, 2012));
    expect(md).toContain("| Year | Population (people) | GDP (USD) |");
    expect(md).toContain("| 2010 | 6 | — |");
    expect(md).toContain("| 2012 | — | 110 |");
  });

  it("renders an aligned plain-text table", () => {
    const txt = toPlainTable(buildComparison([population, gdp], 2010, 2012));
    expect(txt.split("\n")[0]).toContain("Year");
    expect(txt).toContain("110");
  });

  it("handles no overlapping years gracefully", () => {
    const empty = buildComparison([], 2010, 2012);
    expect(toMarkdownTable(empty)).toContain("No overlapping years");
  });
});
