import { DatasetMetadata } from "../schemas/dataset.js";
import { SOURCE_META } from "../schemas/source.js";
import { httpGet } from "../utils/http.js";

const PORTAL = SOURCE_META.unodc.baseUrl;

/**
 * UNODC (UN Office on Drugs and Crime) adapter — STUB.
 *
 * UNODC's data portal exposes NO query-by-country JSON/REST API: crime and drug
 * statistics are published only as bulk Excel (.xlsx) downloads behind a Drupal
 * CMS, with date-stamped URLs that rotate on each annual release. Rather than
 * pull in a spreadsheet-parsing dependency (every other adapter consumes JSON),
 * this exposes a static catalog of the UNODC datasets that actually contain Lao
 * PDR rows (verified live), each pointing at the bulk-download landing page.
 *
 * Coverage note: Laos appears ONLY in the trafficking-in-persons (GLOTIP),
 * prison-population (CTS), and drug-treatment (World Drug Report annex) datasets.
 * UNODC has NO homicide, violent-crime, or criminal-justice-system data for Laos.
 *
 * TODO(unodc-live): to serve actual values, add an xlsx parser, discover the
 * current file URL via the Drupal JSON:API (`/jsonapi/commerce_product_variation/
 * rab_datareport_item`, filter by sku, read field_rab_datareport_dataset.uri),
 * download the workbook, and filter rows to Iso3_code === "LAO".
 */

interface UnodcCatalogItem {
  slug: string;
  title: string;
  description: string;
  topics: string[];
  /** Landing page for the bulk download. */
  url: string;
}

const UNODC_CATALOG: UnodcCatalogItem[] = [
  {
    slug: "trafficking-in-persons",
    title: "Detected victims of trafficking in persons (GLOTIP)",
    description:
      "Detected trafficking victims for Lao PDR by year, sex, age, and form of exploitation " +
      "(2003–2022, with gaps). Counts are frequently suppressed (<5) for small cells.",
    topics: ["trafficking", "crime", "justice", "gender"],
    url: "https://data.unodc.org/",
  },
  {
    slug: "prison-population",
    title: "Prison population — persons held & rate (CTS)",
    description:
      "Persons held in prison (count) and prison population rate per 100,000 for Lao PDR " +
      "(2011–2018), from the UN Crime Trends Survey.",
    topics: ["prison", "incarceration", "crime", "justice"],
    url: "https://data.unodc.org/",
  },
  {
    slug: "drug-treatment",
    title: "Drug treatment admissions (World Drug Report annex)",
    description:
      "Treatment admissions by primary drug of use for Lao PDR (2007, 2019, 2020) — " +
      "Somsanga Treatment & Rehabilitation Centre only; not nationally representative.",
    topics: ["drugs", "treatment", "health", "crime"],
    url: "https://www.unodc.org/unodc/en/data-and-analysis/world-drug-report-2025-annex.html",
  },
];

/** Whether a (future) UNODC live-fetch path has been enabled. Always false today. */
export function unodcLiveEnabled(): boolean {
  return false;
}

/** Search the static UNODC dataset catalog (metadata + landing links only). */
export function searchUnodcCatalog(topic?: string): DatasetMetadata[] {
  const q = topic?.trim().toLowerCase();
  const retrievedAt = new Date().toISOString();
  const items = q
    ? UNODC_CATALOG.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.topics.some((t) => t.toLowerCase().includes(q)) ||
          i.description.toLowerCase().includes(q),
      )
    : UNODC_CATALOG;
  return items.map((i) =>
    DatasetMetadata.parse({
      id: `unodc:${i.slug}`,
      source: "unodc",
      title: i.title,
      description: i.description,
      topics: i.topics,
      formats: ["XLSX"],
      downloadUrl: i.url,
      license: "UNODC — open data, bulk Excel download",
      retrievedAt,
    }),
  );
}

/** Best-effort reachability ping of the UNODC data portal. */
export async function pingUnodc(): Promise<boolean> {
  try {
    await httpGet<unknown>("unodc", PORTAL, { responseType: "text" });
    return true;
  } catch {
    return false;
  }
}
