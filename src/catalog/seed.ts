import { UNICEF_SEED } from "./seed.unicef.js";
import type { CatalogEntry } from "./types.js";

/**
 * Curated World Bank indicators for Lao PDR. Codes are standard World
 * Development Indicators (WDI) series. Extend this list rather than hardcoding
 * codes elsewhere; UNICEF entries are appended in src/catalog/seed.unicef.ts.
 */
export const WORLD_BANK_SEED: CatalogEntry[] = [
  // Demography
  { id: "WB:SP.POP.TOTL", source: "worldbank", code: "SP.POP.TOTL", name: "Population, total", category: "demography", unit: "people" },
  { id: "WB:SP.POP.GROW", source: "worldbank", code: "SP.POP.GROW", name: "Population growth (annual %)", category: "demography", unit: "%" },
  { id: "WB:SP.URB.TOTL.IN.ZS", source: "worldbank", code: "SP.URB.TOTL.IN.ZS", name: "Urban population (% of total)", category: "demography", unit: "%" },
  { id: "WB:SP.DYN.TFRT.IN", source: "worldbank", code: "SP.DYN.TFRT.IN", name: "Fertility rate, total (births per woman)", category: "demography", unit: "births per woman" },
  { id: "WB:SP.DYN.LE00.IN", source: "worldbank", code: "SP.DYN.LE00.IN", name: "Life expectancy at birth, total (years)", category: "health", unit: "years" },

  // Economy
  { id: "WB:NY.GDP.MKTP.CD", source: "worldbank", code: "NY.GDP.MKTP.CD", name: "GDP (current US$)", category: "economy", unit: "USD" },
  { id: "WB:NY.GDP.PCAP.CD", source: "worldbank", code: "NY.GDP.PCAP.CD", name: "GDP per capita (current US$)", category: "economy", unit: "USD" },
  { id: "WB:NY.GDP.MKTP.KD.ZG", source: "worldbank", code: "NY.GDP.MKTP.KD.ZG", name: "GDP growth (annual %)", category: "economy", unit: "%" },
  { id: "WB:FP.CPI.TOTL.ZG", source: "worldbank", code: "FP.CPI.TOTL.ZG", name: "Inflation, consumer prices (annual %)", category: "economy", unit: "%" },
  { id: "WB:BX.KLT.DINV.CD.WD", source: "worldbank", code: "BX.KLT.DINV.CD.WD", name: "Foreign direct investment, net inflows (BoP, current US$)", category: "economy", unit: "USD" },
  { id: "WB:GC.DOD.TOTL.GD.ZS", source: "worldbank", code: "GC.DOD.TOTL.GD.ZS", name: "Central government debt, total (% of GDP)", category: "economy", unit: "%" },

  // Poverty
  { id: "WB:SI.POV.NAHC", source: "worldbank", code: "SI.POV.NAHC", name: "Poverty headcount ratio at national poverty lines (% of population)", category: "poverty", unit: "%" },
  { id: "WB:SI.POV.GINI", source: "worldbank", code: "SI.POV.GINI", name: "Gini index", category: "poverty", unit: "index" },
  { id: "WB:SI.POV.DDAY", source: "worldbank", code: "SI.POV.DDAY", name: "Poverty headcount ratio at $2.15 a day (2017 PPP) (% of population)", category: "poverty", unit: "%" },

  // Education
  { id: "WB:SE.ADT.LITR.ZS", source: "worldbank", code: "SE.ADT.LITR.ZS", name: "Literacy rate, adult total (% of people ages 15 and above)", category: "education", unit: "%" },
  { id: "WB:SE.PRM.ENRR", source: "worldbank", code: "SE.PRM.ENRR", name: "School enrollment, primary (% gross)", category: "education", unit: "%" },
  { id: "WB:SE.SEC.ENRR", source: "worldbank", code: "SE.SEC.ENRR", name: "School enrollment, secondary (% gross)", category: "education", unit: "%" },
  { id: "WB:SE.XPD.TOTL.GD.ZS", source: "worldbank", code: "SE.XPD.TOTL.GD.ZS", name: "Government expenditure on education, total (% of GDP)", category: "education", unit: "%" },

  // Health
  { id: "WB:SH.DYN.MORT", source: "worldbank", code: "SH.DYN.MORT", name: "Mortality rate, under-5 (per 1,000 live births)", category: "health", unit: "per 1,000 live births" },
  { id: "WB:SP.DYN.IMRT.IN", source: "worldbank", code: "SP.DYN.IMRT.IN", name: "Mortality rate, infant (per 1,000 live births)", category: "health", unit: "per 1,000 live births" },
  { id: "WB:SH.STA.MMRT", source: "worldbank", code: "SH.STA.MMRT", name: "Maternal mortality ratio (per 100,000 live births)", category: "health", unit: "per 100,000 live births" },
  { id: "WB:SH.XPD.CHEX.GD.ZS", source: "worldbank", code: "SH.XPD.CHEX.GD.ZS", name: "Current health expenditure (% of GDP)", category: "health", unit: "%" },
  { id: "WB:SH.IMM.MEAS", source: "worldbank", code: "SH.IMM.MEAS", name: "Immunization, measles (% of children ages 12-23 months)", category: "health", unit: "%" },

  // WASH
  { id: "WB:SH.H2O.BASW.ZS", source: "worldbank", code: "SH.H2O.BASW.ZS", name: "People using at least basic drinking water services (% of population)", category: "wash", unit: "%" },
  { id: "WB:SH.STA.BASS.ZS", source: "worldbank", code: "SH.STA.BASS.ZS", name: "People using at least basic sanitation services (% of population)", category: "wash", unit: "%" },

  // Environment / agriculture / energy
  { id: "WB:AG.LND.FRST.ZS", source: "worldbank", code: "AG.LND.FRST.ZS", name: "Forest area (% of land area)", category: "environment", unit: "%" },
  { id: "WB:AG.LND.AGRI.ZS", source: "worldbank", code: "AG.LND.AGRI.ZS", name: "Agricultural land (% of land area)", category: "agriculture", unit: "%" },
  { id: "WB:NV.AGR.TOTL.ZS", source: "worldbank", code: "NV.AGR.TOTL.ZS", name: "Agriculture, forestry, and fishing, value added (% of GDP)", category: "agriculture", unit: "%" },
  { id: "WB:EG.ELC.ACCS.ZS", source: "worldbank", code: "EG.ELC.ACCS.ZS", name: "Access to electricity (% of population)", category: "energy", unit: "%" },
  { id: "WB:EG.FEC.RNEW.ZS", source: "worldbank", code: "EG.FEC.RNEW.ZS", name: "Renewable energy consumption (% of total final energy consumption)", category: "energy", unit: "%" },

  // Technology / infrastructure
  { id: "WB:IT.NET.USER.ZS", source: "worldbank", code: "IT.NET.USER.ZS", name: "Individuals using the Internet (% of population)", category: "technology", unit: "%" },
  { id: "WB:IT.CEL.SETS.P2", source: "worldbank", code: "IT.CEL.SETS.P2", name: "Mobile cellular subscriptions (per 100 people)", category: "technology", unit: "per 100 people" },

  // Trade
  { id: "WB:NE.EXP.GNFS.ZS", source: "worldbank", code: "NE.EXP.GNFS.ZS", name: "Exports of goods and services (% of GDP)", category: "trade", unit: "%" },
  { id: "WB:NE.IMP.GNFS.ZS", source: "worldbank", code: "NE.IMP.GNFS.ZS", name: "Imports of goods and services (% of GDP)", category: "trade", unit: "%" },

  // Labor / gender
  { id: "WB:SL.UEM.TOTL.ZS", source: "worldbank", code: "SL.UEM.TOTL.ZS", name: "Unemployment, total (% of total labor force) (modeled ILO estimate)", category: "labor", unit: "%" },
  { id: "WB:SL.TLF.CACT.FE.ZS", source: "worldbank", code: "SL.TLF.CACT.FE.ZS", name: "Labor force participation rate, female (% of female population ages 15+) (modeled ILO)", category: "gender", unit: "%" },
  { id: "WB:SG.GEN.PARL.ZS", source: "worldbank", code: "SG.GEN.PARL.ZS", name: "Proportion of seats held by women in national parliaments (%)", category: "gender", unit: "%" },
];

/** The full curated catalog: World Bank + UNICEF. */
export const SEED_CATALOG: CatalogEntry[] = [...WORLD_BANK_SEED, ...UNICEF_SEED];
