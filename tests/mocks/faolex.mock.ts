import { http, HttpResponse } from "msw";

export const FAOLEX_QUERY_URL = "https://fao-faolex-prod.appspot.com/api/query";

export const faolexMiningResponse = {
  resultCountExact: "116",
  results: [
    {
      title: "lao40791.pdf",
      url: "https://www.google.com/url?url=https://faolex.fao.org/docs/pdf/lao40791.pdf",
      snippet: { snippet: "MINING LAW. Law No.04/97/NA." },
      metadata: {
        mimeType: "application/pdf",
        fields: [
          { name: "faolexId", textValues: { values: ["LEX-FAOC040791"] } },
          { name: "titleOfText", textValues: { values: ["Mining Law, Law No. 04/97/NA."] } },
          { name: "countryISO3", textValues: { values: ["LAO"] } },
          { name: "typeOfTextEn", textValues: { values: ["Legislation"] } },
          { name: "mainAreaEn", textValues: { values: ["Mineral resources"] } },
          { name: "mainClassifyingKeywordEn", textValues: { values: ["mining"] } },
          { name: "subjectSelectionEn", textValues: { values: ["Minerals and mining"] } },
          { name: "dateOfText", textValues: { values: ["1997-04-12"] } },
          { name: "dateOfModification", textValues: { values: ["2022-02-26"] } },
          { name: "linksToFullText", textValues: { values: ["lao40791.pdf"] } },
          {
            name: "abstract",
            textValues: {
              values: ["This Law defines principles for mining management and mineral resources."],
            },
          },
        ],
      },
    },
  ],
};

export const faolexEmptyResponse = {
  resultCountExact: "0",
  results: [],
};

export function faolexHandler(onHit?: (body: string) => void) {
  return http.post(FAOLEX_QUERY_URL, async ({ request }) => {
    const body = await request.text();
    onHit?.(body);
    return HttpResponse.json(faolexMiningResponse);
  });
}

export function faolexEmptyHandler() {
  return http.post(FAOLEX_QUERY_URL, () => HttpResponse.json(faolexEmptyResponse));
}
