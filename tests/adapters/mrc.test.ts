import { afterEach, describe, expect, it } from "vitest";
import { mrcHasToken, searchMrcCatalog } from "../../src/adapters/mrc.js";

describe("MRC stub", () => {
  const prev = process.env.MRC_SESSION_TOKEN;
  afterEach(() => {
    if (prev === undefined) delete process.env.MRC_SESSION_TOKEN;
    else process.env.MRC_SESSION_TOKEN = prev;
  });

  it("returns the full catalog as valid DatasetMetadata", () => {
    const datasets = searchMrcCatalog();
    expect(datasets.length).toBeGreaterThanOrEqual(6);
    expect(datasets.every((d) => d.source === "mrc")).toBe(true);
    expect(datasets[0]?.id.startsWith("mrc:")).toBe(true);
    expect(datasets[0]?.downloadUrl).toMatch(/^https:\/\/portal\.mrcmekong\.org/);
  });

  it("filters the catalog by topic", () => {
    const fisheries = searchMrcCatalog("fish");
    expect(fisheries.length).toBeGreaterThanOrEqual(1);
    expect(
      fisheries.every((d) => `${d.title} ${d.topics.join(" ")}`.toLowerCase().includes("fish")),
    ).toBe(true);
    expect(searchMrcCatalog("no-such-topic-xyz")).toEqual([]);
  });

  it("detects whether MRC_SESSION_TOKEN is configured", () => {
    delete process.env.MRC_SESSION_TOKEN;
    expect(mrcHasToken()).toBe(false);
    process.env.MRC_SESSION_TOKEN = "tok";
    expect(mrcHasToken()).toBe(true);
  });
});
