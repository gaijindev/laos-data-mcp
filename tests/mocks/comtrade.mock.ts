import { http, HttpResponse } from "msw";

/** Base URL for UN Comtrade preview endpoint. */
export const COMTRADE_URL = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";

/**
 * Sample TOTAL export rows across 2 years.
 * - 2022: isReported = true (normal)
 * - 2021: isReported = false (UN mirror estimate → should add estimated footnote)
 */
export const comtradeTotalExportsResponse = {
  count: 2,
  data: [
    {
      refYear: 2022,
      period: "2022",
      reporterISO: "LAO",
      flowCode: "X",
      flowDesc: "Export",
      partnerCode: 0,
      partnerISO: "W00",
      partnerDesc: "World",
      cmdCode: "TOTAL",
      cmdDesc: "All Commodities",
      primaryValue: 8_123_456_789,
      isReported: true,
    },
    {
      refYear: 2021,
      period: "2021",
      reporterISO: "LAO",
      flowCode: "X",
      flowDesc: "Export",
      partnerCode: 0,
      partnerISO: "W00",
      partnerDesc: "World",
      cmdCode: "TOTAL",
      cmdDesc: "All Commodities",
      primaryValue: 7_500_000_000,
      isReported: false, // UN mirror estimate
    },
  ],
  error: "",
};

/**
 * Sample TOTAL import rows across 2 years.
 */
export const comtradeTotalImportsResponse = {
  count: 2,
  data: [
    {
      refYear: 2022,
      period: "2022",
      reporterISO: "LAO",
      flowCode: "M",
      flowDesc: "Import",
      partnerCode: 0,
      partnerISO: "W00",
      partnerDesc: "World",
      cmdCode: "TOTAL",
      cmdDesc: "All Commodities",
      primaryValue: 5_987_654_321,
      isReported: true,
    },
    {
      refYear: 2021,
      period: "2021",
      reporterISO: "LAO",
      flowCode: "M",
      flowDesc: "Import",
      partnerCode: 0,
      partnerISO: "W00",
      partnerDesc: "World",
      cmdCode: "TOTAL",
      cmdDesc: "All Commodities",
      primaryValue: 5_400_000_000,
      isReported: true,
    },
  ],
  error: "",
};

/**
 * Sample partner breakdown for exports in 2022.
 * Includes partnerCode=0 (World aggregate) which should be filtered out.
 * Several specific partners to test sorting and top-N behavior.
 */
export const comtradePartnersExportsResponse = {
  count: 4,
  data: [
    // This row (partnerCode=0) must be skipped in partner breakdown
    {
      refYear: 2022,
      period: "2022",
      reporterISO: "LAO",
      flowCode: "X",
      partnerCode: 0,
      partnerISO: "W00",
      partnerDesc: "World",
      cmdCode: "TOTAL",
      primaryValue: 8_123_456_789,
      isReported: true,
    },
    {
      refYear: 2022,
      period: "2022",
      reporterISO: "LAO",
      flowCode: "X",
      partnerCode: 156,
      partnerISO: "CHN",
      partnerDesc: "China",
      cmdCode: "TOTAL",
      primaryValue: 3_500_000_000,
      isReported: true,
    },
    {
      refYear: 2022,
      period: "2022",
      reporterISO: "LAO",
      flowCode: "X",
      partnerCode: 764,
      partnerISO: "THA",
      partnerDesc: "Thailand",
      cmdCode: "TOTAL",
      primaryValue: 2_200_000_000,
      isReported: false, // estimated
    },
    {
      refYear: 2022,
      period: "2022",
      reporterISO: "LAO",
      flowCode: "X",
      partnerCode: 704,
      partnerISO: "VNM",
      partnerDesc: "Viet Nam",
      cmdCode: "TOTAL",
      primaryValue: 1_100_000_000,
      isReported: true,
    },
  ],
  error: "",
};

/** MSW handler that responds to all Comtrade requests, branching on flowCode and partnerCode. */
export function comtradeHandler(onHit?: () => void) {
  return http.get(COMTRADE_URL, ({ request }) => {
    onHit?.();
    const url = new URL(request.url);
    const flowCode = url.searchParams.get("flowCode");
    const partnerCode = url.searchParams.get("partnerCode");

    // Partner breakdown requests set partnerCode=0 to get all partners
    // Total requests also set partnerCode=0 but with a single-year period in partner tests
    // We distinguish by checking the period — single year = partner request in tests
    const period = url.searchParams.get("period") ?? "";
    const isSingleYear = !period.includes(",") && period.length === 4;

    if (flowCode === "X" && isSingleYear && partnerCode === "0") {
      // This is the partner breakdown test — return multiple partner rows
      return HttpResponse.json(comtradePartnersExportsResponse);
    }
    if (flowCode === "X") {
      return HttpResponse.json(comtradeTotalExportsResponse);
    }
    if (flowCode === "M") {
      return HttpResponse.json(comtradeTotalImportsResponse);
    }
    // Default fallback
    return HttpResponse.json(comtradeTotalExportsResponse);
  });
}

/** Handler that returns exports total data. */
export function comtradeTotalExportsHandler(onHit?: () => void) {
  return http.get(COMTRADE_URL, ({ request }) => {
    onHit?.();
    const url = new URL(request.url);
    const flowCode = url.searchParams.get("flowCode");
    if (flowCode === "M") return HttpResponse.json(comtradeTotalImportsResponse);
    return HttpResponse.json(comtradeTotalExportsResponse);
  });
}

/** Handler that returns partner breakdown for exports in 2022. */
export function comtradePartnersHandler(onHit?: () => void) {
  return http.get(COMTRADE_URL, () => {
    onHit?.();
    return HttpResponse.json(comtradePartnersExportsResponse);
  });
}
