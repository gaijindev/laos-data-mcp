import type { CatalogEntry } from "./types.js";

/**
 * Curated UNICEF indicators (codes verified against the live SDMX warehouse).
 * Codes are "DATAFLOW:INDICATOR"; get_laos_welfare_data fetches a whole topic,
 * while get_laos_indicator can fetch a single code.
 */
export const UNICEF_SEED: CatalogEntry[] = [
  // Nutrition
  { id: "UNICEF:NUTRITION:NT_ANT_HAZ_NE2", source: "unicef", code: "NUTRITION:NT_ANT_HAZ_NE2", name: "Stunting prevalence (height-for-age <-2 SD)", category: "nutrition", unit: "%", dataflow: "NUTRITION" },
  { id: "UNICEF:NUTRITION:NT_ANT_WHZ_NE2", source: "unicef", code: "NUTRITION:NT_ANT_WHZ_NE2", name: "Wasting prevalence (weight-for-height <-2 SD)", category: "nutrition", unit: "%", dataflow: "NUTRITION" },
  { id: "UNICEF:NUTRITION:NT_ANT_WHZ_PO2", source: "unicef", code: "NUTRITION:NT_ANT_WHZ_PO2", name: "Overweight prevalence (weight-for-height >+2 SD)", category: "nutrition", unit: "%", dataflow: "NUTRITION" },
  { id: "UNICEF:NUTRITION:NT_BF_EXBF", source: "unicef", code: "NUTRITION:NT_BF_EXBF", name: "Exclusive breastfeeding (0-5 months)", category: "nutrition", unit: "%", dataflow: "NUTRITION" },
  { id: "UNICEF:NUTRITION:NT_BW_LBW", source: "unicef", code: "NUTRITION:NT_BW_LBW", name: "Low birth weight prevalence", category: "nutrition", unit: "%", dataflow: "NUTRITION" },

  // Education
  { id: "UNICEF:EDUCATION:ED_ANAR_L1", source: "unicef", code: "EDUCATION:ED_ANAR_L1", name: "Adjusted net attendance rate, primary", category: "education", unit: "%", dataflow: "EDUCATION" },
  { id: "UNICEF:EDUCATION:ED_ANAR_L2", source: "unicef", code: "EDUCATION:ED_ANAR_L2", name: "Adjusted net attendance rate, lower secondary", category: "education", unit: "%", dataflow: "EDUCATION" },
  { id: "UNICEF:EDUCATION:ED_ANAR_L3", source: "unicef", code: "EDUCATION:ED_ANAR_L3", name: "Adjusted net attendance rate, upper secondary", category: "education", unit: "%", dataflow: "EDUCATION" },
  { id: "UNICEF:EDUCATION:ED_ROFST_L1_ADM", source: "unicef", code: "EDUCATION:ED_ROFST_L1_ADM", name: "Out-of-school rate, primary (administrative)", category: "education", unit: "%", dataflow: "EDUCATION" },

  // Health (MNCH)
  { id: "UNICEF:MNCH:MNCH_ANC1", source: "unicef", code: "MNCH:MNCH_ANC1", name: "Antenatal care, at least 1 visit", category: "health", unit: "%", dataflow: "MNCH" },
  { id: "UNICEF:MNCH:MNCH_ANC4", source: "unicef", code: "MNCH:MNCH_ANC4", name: "Antenatal care, at least 4 visits", category: "health", unit: "%", dataflow: "MNCH" },
  { id: "UNICEF:MNCH:MNCH_ABR", source: "unicef", code: "MNCH:MNCH_ABR", name: "Adolescent birth rate", category: "health", unit: "per 1,000 women 15-19", dataflow: "MNCH" },

  // Gender
  { id: "UNICEF:GENDER:GN_LF_PTCPN", source: "unicef", code: "GENDER:GN_LF_PTCPN", name: "Labour force participation rate", category: "gender", unit: "%", dataflow: "GENDER" },
  { id: "UNICEF:GENDER:GN_UNMPLY", source: "unicef", code: "GENDER:GN_UNMPLY", name: "Labour force unemployment rate", category: "gender", unit: "%", dataflow: "GENDER" },
  { id: "UNICEF:GENDER:GN_MTNTY_LV_BNFTS", source: "unicef", code: "GENDER:GN_MTNTY_LV_BNFTS", name: "Maternity leave benefits", category: "gender", dataflow: "GENDER" },

  // Demography
  { id: "UNICEF:DM:DM_POP_TOT", source: "unicef", code: "DM:DM_POP_TOT", name: "Total population (UNICEF)", category: "demography", dataflow: "DM" },
  { id: "UNICEF:DM:DM_POP_U5", source: "unicef", code: "DM:DM_POP_U5", name: "Population under age 5", category: "demography", dataflow: "DM" },
  { id: "UNICEF:DM:DM_POP_U18", source: "unicef", code: "DM:DM_POP_U18", name: "Population under age 18", category: "demography", dataflow: "DM" },
  { id: "UNICEF:DM:DM_POP_ADLCNT", source: "unicef", code: "DM:DM_POP_ADLCNT", name: "Adolescent population (10-19)", category: "demography", dataflow: "DM" },

  // WASH
  { id: "UNICEF:WASH_HOUSEHOLDS:WS_PPL_S-ALB", source: "unicef", code: "WASH_HOUSEHOLDS:WS_PPL_S-ALB", name: "Population using at least basic sanitation services", category: "wash", unit: "%", dataflow: "WASH_HOUSEHOLDS" },
  { id: "UNICEF:WASH_HOUSEHOLDS:WS_PPL_W-P", source: "unicef", code: "WASH_HOUSEHOLDS:WS_PPL_W-P", name: "Population using piped drinking water sources", category: "wash", unit: "%", dataflow: "WASH_HOUSEHOLDS" },
  { id: "UNICEF:WASH_HOUSEHOLDS:WS_PPL_W-AVA", source: "unicef", code: "WASH_HOUSEHOLDS:WS_PPL_W-AVA", name: "Population using improved drinking water available when needed", category: "wash", unit: "%", dataflow: "WASH_HOUSEHOLDS" },
];
