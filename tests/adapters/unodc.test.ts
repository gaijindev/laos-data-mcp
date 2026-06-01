import { describe, expect, it } from "vitest";
import { searchUnodcCatalog, unodcLiveEnabled } from "../../src/adapters/unodc.js";

describe("UNODC stub", () => {
  it("returns the full catalog as valid DatasetMetadata", () => {
    const datasets = searchUnodcCatalog();
    expect(datasets.length).toBeGreaterThanOrEqual(3);
    expect(datasets.every((d) => d.source === "unodc")).toBe(true);
    expect(datasets[0]?.id.startsWith("unodc:")).toBe(true);
    expect(datasets.every((d) => d.formats.includes("XLSX"))).toBe(true);
    expect(datasets.every((d) => typeof d.downloadUrl === "string")).toBe(true);
  });

  it("filters the catalog by topic", () => {
    const trafficking = searchUnodcCatalog("trafficking");
    expect(trafficking.length).toBeGreaterThanOrEqual(1);
    expect(
      trafficking.every((d) =>
        `${d.title} ${d.description} ${d.topics.join(" ")}`.toLowerCase().includes("trafficking"),
      ),
    ).toBe(true);
    expect(searchUnodcCatalog("no-such-topic-xyz")).toEqual([]);
  });

  it("reports live extraction as disabled (stub)", () => {
    expect(unodcLiveEnabled()).toBe(false);
  });
});
