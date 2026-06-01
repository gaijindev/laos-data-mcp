import { http, HttpResponse } from "msw";

export const LSB_SDG_311_URL = "https://sdg-laos.github.io/data-production/en/data/3-1-1.csv";
export const LSB_SDG_411_URL = "https://sdg-laos.github.io/data-production/en/data/4-1-1.csv";
export const LSB_SDG_HEADLINE_311_URL =
  "https://sdg-laos.github.io/data-production/en/headline/3-1-1.csv";

export const lsbSdg311Csv = `Year,SERIES,Reference area,UNIT_MEASURE,GeoCode,Value
2015,Maternal mortality ratio [3.1.1],,"Per 100,000 population",,206
2016,Maternal mortality ratio [3.1.1],,"Per 100,000 population",,196
2017,Maternal mortality ratio [3.1.1],,"Per 100,000 population",,185
2018,Maternal mortality ratio [3.1.1],,"Per 100,000 population",,72
2019,Maternal mortality ratio [3.1.1],,"Per 100,000 population",,70
`;

export const lsbSdg411Csv = `Year,SERIES,Reference area,Sex,UNIT_MEASURE,GeoCode,Value
2017,Proportion of children and young people achieving a minimum proficiency level in reading and mathematics [4.1.1],,Male,Percent,,11.8
2017,Proportion of children and young people achieving a minimum proficiency level in reading and mathematics [4.1.1],,Female,Percent,,7.3
`;

export function lsbSdg311Handler(onHit?: () => void) {
  return http.get(LSB_SDG_311_URL, () => {
    onHit?.();
    return HttpResponse.text(lsbSdg311Csv, {
      headers: { "content-type": "text/csv" },
    });
  });
}

export function lsbSdg411Handler(onHit?: () => void) {
  return http.get(LSB_SDG_411_URL, () => {
    onHit?.();
    return HttpResponse.text(lsbSdg411Csv, {
      headers: { "content-type": "text/csv" },
    });
  });
}

export function lsbSdgPingHandler() {
  return http.get(LSB_SDG_HEADLINE_311_URL, () =>
    HttpResponse.text(lsbSdg311Csv, {
      headers: { "content-type": "text/csv" },
    }),
  );
}
