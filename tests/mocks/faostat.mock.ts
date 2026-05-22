import { http, HttpResponse } from "msw";

export const FAOSTAT_DATA_URL = "https://fenixservices.fao.org/faostat/api/v1/en/data/:domain";

/** Mirrors FAOSTAT's documented `{ data: [...] }` shape with Title-Case fields. */
export const faostatQclResponse = {
  data: [
    {
      "Area Code": "116",
      Area: "Lao People's Democratic Republic",
      "Item Code": "27",
      Item: "Rice",
      "Element Code": "5510",
      Element: "Production",
      "Year Code": "2022",
      Year: "2022",
      Unit: "t",
      Value: 3_500_000,
      Flag: "A",
    },
    {
      "Area Code": "116",
      Area: "Lao People's Democratic Republic",
      "Item Code": "27",
      Item: "Rice",
      "Element Code": "5510",
      Element: "Production",
      Year: "2021",
      Unit: "t",
      Value: 3_400_000,
      Flag: "A",
    },
    {
      "Area Code": "116",
      Area: "Lao People's Democratic Republic",
      "Item Code": "56",
      Item: "Maize",
      "Element Code": "5510",
      Element: "Production",
      Year: "2022",
      Unit: "t",
      Value: 1_200_000,
      Flag: "A",
    },
  ],
};

export function faostatHandler(onHit?: () => void) {
  return http.get(FAOSTAT_DATA_URL, () => {
    onHit?.();
    return HttpResponse.json(faostatQclResponse);
  });
}
