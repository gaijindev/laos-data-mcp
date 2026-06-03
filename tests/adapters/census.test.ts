import { afterEach, describe, expect, it } from "vitest";
import { census2025Available, getCensusData } from "../../src/adapters/census.js";

describe("census stub", () => {
  const prev = process.env.CENSUS_2025_AVAILABLE;
  afterEach(() => {
    if (prev === undefined) delete process.env.CENSUS_2025_AVAILABLE;
    else process.env.CENSUS_2025_AVAILABLE = prev;
  });

  it("returns 2015 census summary figures", () => {
    const { records } = getCensusData();
    expect(records.length).toBeGreaterThanOrEqual(6);
    const total = records.find((r) => r.indicatorCode === "POP_TOTAL");
    expect(total).toMatchObject({
      source: "census",
      countryCode: "LA",
      year: 2015,
      value: 6_492_228,
    });
    // male + female sum to total
    const male = records.find((r) => r.indicatorCode === "POP_MALE")?.value ?? 0;
    const female = records.find((r) => r.indicatorCode === "POP_FEMALE")?.value ?? 0;
    expect(male + female).toBe(6_492_228);
  });

  it("filters figures by topic", () => {
    const { records } = getCensusData("literacy");
    expect(records).toHaveLength(1);
    expect(records[0]?.indicatorCode).toBe("LITERACY_15");
  });

  it("notes 2025 availability based on the env flag", () => {
    delete process.env.CENSUS_2025_AVAILABLE;
    expect(getCensusData(undefined, 2025).note).toContain("expected Q1");

    process.env.CENSUS_2025_AVAILABLE = "true";
    expect(census2025Available()).toBe(true);
    expect(getCensusData(undefined, 2025).note).toContain("not yet bundled");
  });
});
