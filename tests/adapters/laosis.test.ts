import { afterEach, describe, expect, it } from "vitest";
import {
  getLaosisCategories,
  laosisHasApiKey,
  LAOSIS_CATEGORIES,
} from "../../src/adapters/laosis.js";

describe("laosis stub", () => {
  const prev = process.env.LAOSIS_API_KEY;
  afterEach(() => {
    if (prev === undefined) delete process.env.LAOSIS_API_KEY;
    else process.env.LAOSIS_API_KEY = prev;
  });

  it("exposes 24 known statistical categories", () => {
    expect(LAOSIS_CATEGORIES.length).toBe(24);
    expect(getLaosisCategories()).toContain("Health and Nutrition");
  });

  it("detects whether a LAOSIS_API_KEY is configured", () => {
    delete process.env.LAOSIS_API_KEY;
    expect(laosisHasApiKey()).toBe(false);
    process.env.LAOSIS_API_KEY = "  ";
    expect(laosisHasApiKey()).toBe(false);
    process.env.LAOSIS_API_KEY = "real-key";
    expect(laosisHasApiKey()).toBe(true);
  });
});
