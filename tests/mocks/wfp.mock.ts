import { http, HttpResponse } from "msw";

export const WFP_TOKEN_URL = "https://api.wfp.org/token";
export const WFP_PRICES_URL =
  "https://gateway.api.wfp.org/vam-data-bridges/v1/MarketPrices/PriceMonthly";

export const wfpPricesResponse = [
  {
    commodityName: "Rice",
    marketName: "Vientiane",
    price: 8500,
    currencyName: "LAK",
    commodityUnitName: "KG",
    year: 2023,
    month: "2023-06",
  },
  {
    commodityName: "Maize",
    marketName: "Savannakhet",
    price: 4000,
    currencyName: "LAK",
    commodityUnitName: "KG",
    year: 2022,
  },
];

export function wfpTokenHandler(onHit?: () => void, expiresIn = 3600) {
  return http.post(WFP_TOKEN_URL, () => {
    onHit?.();
    return HttpResponse.json({
      access_token: `tok-${Math.random()}`,
      token_type: "Bearer",
      expires_in: expiresIn,
    });
  });
}

export function wfpPricesHandler(onHit?: () => void) {
  return http.get(WFP_PRICES_URL, () => {
    onHit?.();
    return HttpResponse.json(wfpPricesResponse);
  });
}
