import { http, HttpResponse } from "msw";

export const IMF_NGDP_URL = "https://www.imf.org/external/datamapper/api/v2/NGDP_RPCH/LAO";

/** Includes a 2031 forecast year that must be dropped (schema caps at 2030). */
export const imfNgdpResponse = {
  indicators: { NGDP_RPCH: { label: "Real GDP growth", unit: "Annual percent change" } },
  values: { NGDP_RPCH: { LAO: { "2020": 0.5, "2021": 2.1, "2022": 4.4, "2031": 3.0 } } },
};

export function imfHandler(onHit?: () => void) {
  return http.get(IMF_NGDP_URL, () => {
    onHit?.();
    return HttpResponse.json(imfNgdpResponse);
  });
}
