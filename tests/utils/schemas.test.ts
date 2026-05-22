import { describe, it, expect } from "vitest";
import { IndicatorRecord } from "../../src/schemas/indicator.js";
import { DatasetMetadata } from "../../src/schemas/dataset.js";
import { SourceEnum } from "../../src/schemas/source.js";

const validIndicator = {
  id: "WB:SP.POP.TOTL",
  source: "worldbank",
  indicatorCode: "SP.POP.TOTL",
  indicatorName: "Population, total",
  category: "demography",
  countryCode: "LA",
  countryName: "Lao PDR",
  year: 2023,
  value: 7_664_993,
  unit: "",
  retrievedAt: new Date().toISOString(),
};

const validDataset = {
  id: "mekong:rice-production",
  source: "mekong",
  title: "Rice production by province",
  topics: ["agriculture"],
  formats: ["CSV", "XLSX"],
  downloadUrl: "https://example.org/rice.csv",
  retrievedAt: new Date().toISOString(),
};

describe("SourceEnum", () => {
  it("accepts all five known sources", () => {
    for (const s of ["worldbank", "unicef", "adb", "mekong", "laosis"]) {
      expect(SourceEnum.parse(s)).toBe(s);
    }
  });
  it("rejects unknown sources", () => {
    expect(() => SourceEnum.parse("oecd")).toThrow();
  });
});

describe("IndicatorRecord", () => {
  it("accepts a valid record", () => {
    expect(IndicatorRecord.parse(validIndicator)).toMatchObject({ id: "WB:SP.POP.TOTL" });
  });
  it("allows a null value (missing observation)", () => {
    expect(IndicatorRecord.parse({ ...validIndicator, value: null }).value).toBeNull();
  });
  it("rejects a non-Laos country code", () => {
    expect(() => IndicatorRecord.parse({ ...validIndicator, countryCode: "TH" })).toThrow();
  });
  it("rejects an out-of-range year", () => {
    expect(() => IndicatorRecord.parse({ ...validIndicator, year: 1900 })).toThrow();
  });
  it("rejects a non-ISO retrievedAt", () => {
    expect(() => IndicatorRecord.parse({ ...validIndicator, retrievedAt: "yesterday" })).toThrow();
  });
  it("rejects a non-numeric value", () => {
    expect(() => IndicatorRecord.parse({ ...validIndicator, value: "lots" })).toThrow();
  });
});

describe("DatasetMetadata", () => {
  it("accepts a valid dataset", () => {
    expect(DatasetMetadata.parse(validDataset).title).toBe("Rice production by province");
  });
  it("allows an omitted downloadUrl", () => {
    const { downloadUrl: _omit, ...rest } = validDataset;
    expect(DatasetMetadata.parse(rest).downloadUrl).toBeUndefined();
  });
  it("rejects a malformed downloadUrl", () => {
    expect(() => DatasetMetadata.parse({ ...validDataset, downloadUrl: "not a url" })).toThrow();
  });
  it("requires topics and formats to be arrays", () => {
    expect(() => DatasetMetadata.parse({ ...validDataset, topics: "agriculture" })).toThrow();
  });
});
