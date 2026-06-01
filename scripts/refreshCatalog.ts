/**
 * Regenerate src/catalog/indicators.json from the curated catalog so the file
 * stays a faithful snapshot for external consumers. The live resource builds
 * the same document on demand, so this is for publishing, not runtime.
 *
 * Run: pnpm run refresh-catalog
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogDocument } from "../src/resources/indicatorCatalog.js";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "src", "catalog", "indicators.json");

const doc = buildCatalogDocument();
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");

// stderr so it never pollutes any piped stdout
console.error(
  `refresh-catalog: wrote ${doc.totalIndicators} indicators across ${Object.keys(doc.categories).length} categories to ${outPath}`,
);
