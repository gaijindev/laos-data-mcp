import { describe, expect, it } from "vitest";
import { resolveIndicator } from "../../src/tools/getIndicator.js";

describe("resolveIndicator", () => {
  it("treats a bare WDI-style code as World Bank", () => {
    expect(resolveIndicator("SP.POP.TOTL")).toEqual({ source: "worldbank", code: "SP.POP.TOTL" });
  });

  it("strips a known source prefix", () => {
    expect(resolveIndicator("WB:SP.POP.TOTL")).toEqual({
      source: "worldbank",
      code: "SP.POP.TOTL",
    });
    expect(resolveIndicator("UNICEF:DM:DM_POP_TOT")).toEqual({
      source: "unicef",
      code: "DM:DM_POP_TOT",
    });
  });

  it("resolves a catalog code to its source", () => {
    expect(resolveIndicator("NUTRITION:NT_ANT_HAZ_NE2")).toEqual({
      source: "unicef",
      code: "NUTRITION:NT_ANT_HAZ_NE2",
    });
  });

  it("honors an explicit source override", () => {
    expect(resolveIndicator("SP.POP.TOTL", "unicef")).toEqual({
      source: "unicef",
      code: "SP.POP.TOTL",
    });
  });

  it("defaults unknown inputs to World Bank", () => {
    expect(resolveIndicator("something-odd")).toEqual({
      source: "worldbank",
      code: "something-odd",
    });
  });
});
