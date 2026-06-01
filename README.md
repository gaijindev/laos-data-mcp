# laos-data-mcp

[![CI](https://github.com/gaijindev/laos-data-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gaijindev/laos-data-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)
[![MCP](https://img.shields.io/badge/MCP-server-5E5CE6)](https://modelcontextprotocol.io)

A unified [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that
connects **14 international and national data sources** for **Lao PDR (Laos)** behind one
interface, normalizes their responses into a single consistent schema, and exposes them as
MCP **tools**, **resources**, and **prompts**.

Instead of wiring up the World Bank, UNICEF, Open Development Mekong, ADB, FAOSTAT, WHO,
IMF, HDX, WFP, OpenStreetMap, the Mekong River Commission, the Lao Statistics Bureau,
and the official Lao SDG platform separately every time, researchers, policymakers, civic technologists, and AI agents can
query Laos data through a single gateway — in plain language, through any MCP client.

## Contents

- [Why this exists](#why-this-exists)
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation & setup](#installation--setup)
- [Your first query](#your-first-query)
- [Claude integration](#claude-integration)
- [Tools](#tools)
- [Resources](#resources)
- [Prompts](#prompts)
- [Data source reference](#data-source-reference)
- [Troubleshooting](#troubleshooting)
- [Requesting Laosis (LSB) access](#requesting-laosis-lsb-access)
- [Contributing](#contributing)
- [License](#license)

## Why this exists

**Data about Laos is abundant, but it is fragmented to the point of being impractical.**

A surprising amount of high-quality data about Lao PDR already exists — the World Bank
tracks development indicators, UNICEF tracks child welfare, the FAO tracks agriculture,
the WHO tracks health, the IMF tracks the macroeconomy, OCHA/HDX track humanitarian
indicators, WFP tracks market prices, OpenStreetMap maps infrastructure, and the Lao
Statistics Bureau holds the official national figures. The problem is never _whether_ the
data exists. The problem is that **every source speaks a different language**, and anyone
who wants a cross-cutting picture of the country has to become an integration engineer
first.

In practice, pulling Laos data from these sources means dealing with all of this at once:

- **A different API style per source** — REST JSON (World Bank, FAOSTAT, IMF),
  SDMX-JSON/XML (UNICEF), CKAN (OD Mekong, ADB, HDX), OData (WHO), Overpass QL
  (OpenStreetMap), and OAuth2-gated endpoints (WFP). No two are queried the same way.
- **A different identity for the same country** — Laos is `LA` at the World Bank, `LAO`
  (ISO3) at UNICEF and the WHO, area code `116` at the FAO, and a path segment the IMF
  silently ignores. Get it wrong and you get an empty result or someone else's data.
- **Source-specific traps that aren't in any docs** — the World Bank wraps its records in
  a double-array where the first element is just paging metadata; the IMF returns all ~229
  countries no matter what you ask for, plus forecast years you have to filter out; ADB
  sits behind a Cloudflare bot challenge that returns HTML instead of JSON; FAOSTAT
  intermittently 521s; Overpass rejects clients without the right headers. Each of these is
  a half-day of debugging the first time you hit it.
- **No shared shape** — every source returns its own field names, units, and nesting, so
  even after you fetch the data you still can't put two indicators in the same table without
  bespoke glue.

The result is that a question as simple as _"how have child stunting, GDP per capita, and
rice production in Laos moved together over the last decade?"_ touches three different
organizations, three different protocols, three different country codes, and three
different response shapes — before any analysis happens at all. That cost is paid over and
over by every researcher, journalist, NGO analyst, and student who starts from scratch.

**laos-data-mcp exists to pay that cost once.** It absorbs the protocol differences, the
country-code translation, and the per-source quirks into 14 adapters, and normalizes
everything into two shared shapes (`IndicatorRecord` and `DatasetMetadata`). What comes out
is a single, predictable interface where indicators from any source can be discovered,
fetched, and compared side by side — and, because it speaks MCP, where an AI agent can
answer questions about Laos grounded in real, cited, source-attributed data instead of
guessing. Adding another source is then purely additive; it never breaks the
sources already there.

> This project supports a broader civic-data initiative to improve data connectivity and
> interoperability for Laos, in alignment with the country's Digital Government Strategy
> and World Bank statistical capacity-building work. Open data only delivers on its
> promise when it is actually _usable_ — the goal here is to lower the barrier between a
> question about Laos and a well-sourced answer to as close to zero as possible.

## Overview

**Coverage:** 14 data sources · 17 tools · 2 resources · 4 prompts · 180 catalog indicators.

Every adapter normalizes its source into one of two shared shapes:

- **`IndicatorRecord`** — a single observation: `{ id, source, indicatorCode, indicatorName,
category, countryCode: "LA", countryName: "Lao PDR", year, value, unit?, footnote?, retrievedAt }`.
- **`DatasetMetadata`** — a catalog entry pointing at downloadable files: `{ id, source, title,
description?, topics[], formats[], downloadUrl?, lastUpdated?, license?, retrievedAt }`.

Responses are cached in-memory with per-source TTLs, HTTP calls retry with exponential
backoff, and every tool returns human-readable errors (never raw stack traces).

```
MCP client ──> laos-data-mcp ──> 14 adapters ──> World Bank · UNICEF · OD Mekong · ADB · Laosis
                    │                             FAOSTAT · WHO · IMF · HDX · WFP · OSM · MRC · Census · LSB SDG
                    │             └─ normalize ──> IndicatorRecord / DatasetMetadata
                    └─ tools • resources • prompts
```

## Prerequisites

- **Node.js 22.13+** for local development — the pnpm 11 toolchain requires it. (The
  built server itself runs on Node 18+; CI builds and tests on Node 22.)
- **[pnpm](https://pnpm.io) 10+**
- No API keys for the public sources (World Bank, UNICEF, OD Mekong, FAOSTAT, WHO, IMF,
  OpenStreetMap, LSB SDG). Optional free credentials unlock HDX HAPI (`HDX_APP_ID`), WFP VAM
  (`WFP_CLIENT_ID`/`WFP_CLIENT_SECRET`), MRC (`MRC_SESSION_TOKEN`), and Laosis.

## Installation & setup

**1. Clone and install:**

```bash
git clone https://github.com/gaijindev/laos-data-mcp.git
cd laos-data-mcp
pnpm install
```

> No pnpm? Install it with `npm install -g pnpm` or `corepack enable`. The repo also pins
> pnpm via `packageManager`, so `corepack` will fetch the right version automatically.

**2. (Optional) configure credentials.** All values are optional — the server runs against
the public, no-auth sources out of the box. Only copy this if you want to unlock the
credentialed sources (HDX HAPI, WFP, MRC, Laosis):

```bash
cp .env.example .env    # then edit .env
```

**3. Build and run:**

```bash
pnpm build
pnpm start              # launches the MCP server on stdio
```

For local development there is no build step — `pnpm dev` runs from source with auto-reload:

```bash
pnpm dev
```

**4. Verify it works.** The `pnpm ask` harness drives the real server over an in-memory
transport, so you can exercise every tool without wiring up an MCP client first:

```bash
pnpm ask list                                          # list all tools, resources, prompts
pnpm ask call get_source_status '{}'                   # health + cache stats for all 14 sources
pnpm ask call get_laos_indicator '{"indicatorCode":"SP.POP.TOTL"}'
```

If `get_laos_indicator` returns a population time series for Lao PDR, the install is good.

**Quality gate** (the same checks CI runs on every PR):

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm format:check      # Prettier — run `pnpm format` to auto-fix
pnpm test:coverage     # enforces the coverage thresholds (≥80% lines)
```

### Environment variables

All are optional — see [`.env.example`](.env.example). Highlights:

| Variable                | Default | Purpose                                                     |
| ----------------------- | ------- | ----------------------------------------------------------- |
| `LAOSIS_API_KEY`        | —       | Enables the Laosis adapter once LSB grants API access.      |
| `HDX_APP_ID`            | —       | Free, no login — enables HDX HAPI indicator values.         |
| `WFP_CLIENT_ID`         | —       | WFP VAM OAuth2 client id (enables food prices).             |
| `WFP_CLIENT_SECRET`     | —       | WFP VAM OAuth2 client secret.                               |
| `MRC_SESSION_TOKEN`     | —       | MRC portal token (free registration) for raw MRC data.      |
| `CENSUS_2025_AVAILABLE` | —       | Set `true` once the 2025 Lao census results are published.  |
| `CACHE_ENABLED`         | `true`  | Set `false` to disable caching (useful during development). |
| `MCP_TRANSPORT`         | `stdio` | `stdio` (local) or `http` (remote deployment).              |
| `MCP_HTTP_PORT`         | `3000`  | Port for the HTTP transport.                                |
| `LOG_LEVEL`             | `info`  | `debug` \| `info` \| `warn` \| `error` (logs go to stderr). |

## Your first query

A typical session goes **discover → fetch → compare**. Using the `pnpm ask` harness (the
same calls an MCP client or AI agent would make):

```bash
# 1. Discover valid indicator codes for a topic
pnpm ask call list_available_indicators '{"category":"health"}'

# 2. Fetch a single indicator as a time series
pnpm ask call get_laos_indicator '{"indicatorCode":"SP.DYN.LE00.IN","startYear":2010,"endYear":2022}'

# 3. Put several indicators side by side in one aligned table
pnpm ask call compare_indicators '{"indicators":[{"code":"NY.GDP.PCAP.CD"},{"code":"SE.ADT.LITR.ZS"}]}'
```

Every numeric tool returns the same normalized `IndicatorRecord` shape, so a response looks
like:

```jsonc
{
  "id": "worldbank:SP.POP.TOTL:2022",
  "source": "worldbank",
  "indicatorCode": "SP.POP.TOTL",
  "indicatorName": "Population, total",
  "category": "demography",
  "countryCode": "LA",
  "countryName": "Lao PDR",
  "year": 2022,
  "value": 7529475,
  "unit": null,
  "retrievedAt": "2026-06-02T00:00:00.000Z",
}
```

Because the country code, field names, and units are normalized across all 14 sources, you
can merge World Bank, UNICEF, WHO, and IMF indicators in a single `compare_indicators` call
without any per-source glue. If a source looks unreachable, call `get_source_status` to see
which adapters are up and what is cached.

## Claude integration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "laos-data": {
      "command": "node",
      "args": ["/absolute/path/to/laos-data-mcp/dist/index.js"],
      "env": {
        "LAOSIS_API_KEY": "optional-if-you-have-one"
      }
    }
  }
}
```

### Claude Code (in-project)

This repo ships [`.claude/mcp.json`](.claude/mcp.json), which runs the server from source
with `tsx` — no build step needed:

```json
{
  "mcpServers": {
    "laos-data": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"]
    }
  }
}
```

## Tools

| Tool                                | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `list_available_indicators`         | Discover valid indicator codes (catalog browse).                 |
| `get_laos_indicator`                | Time series for one indicator (World Bank / UNICEF / WHO / IMF). |
| `get_laos_welfare_data`             | UNICEF welfare data by topic, with disaggregation.               |
| `search_laos_datasets`              | Search dataset files across OD Mekong + ADB.                     |
| `compare_indicators`                | Merge 2–6 indicators into one aligned table.                     |
| `get_source_status`                 | Health + cache stats for all sources.                            |
| `get_official_stats`                | Lao Statistics Bureau official-statistics categories.            |
| `get_laos_agriculture_data`         | FAOSTAT crops/food-balance/food-security/land/forestry.          |
| `get_laos_health_data`              | WHO Global Health Observatory indicators.                        |
| `get_laos_macro_data`               | IMF DataMapper (WEO) macroeconomic indicators.                   |
| `get_laos_humanitarian_data`        | HDX HAPI humanitarian indicator values (needs `HDX_APP_ID`).     |
| `search_laos_humanitarian_datasets` | Search the HDX dataset catalog.                                  |
| `get_laos_food_prices`              | WFP VAM market prices (needs WFP OAuth2 creds).                  |
| `get_laos_infrastructure`           | OpenStreetMap infrastructure (hospitals, schools, …).            |
| `search_mekong_data`                | Mekong River Commission dataset catalog (stub).                  |
| `get_laos_census_data`              | Lao census summary figures (2015; 2025 pending).                 |
| `get_laos_sdg_progress`             | Official LSB SDG Platform indicators, including national SDG 18. |

### `list_available_indicators`

Inputs: `source?` (a source or `"all"`), `category?`, `search?`.

```jsonc
{ "category": "health" }
// → grouped markdown list of health indicators with codes, e.g. `SH.DYN.MORT`.
```

### `get_laos_indicator`

Inputs: `indicatorCode` (e.g. `"SP.POP.TOTL"`, optionally prefixed `"WB:…"` / `"NUTRITION:…"`),
`source?`, `startYear?` (default 2000), `endYear?` (default current year),
`format?` (`"records"` | `"timeseries"`).

```jsonc
{ "indicatorCode": "SP.POP.TOTL", "startYear": 2018, "endYear": 2023 }
// → "Retrieved 6 record(s) for SP.POP.TOTL (Population, total) from worldbank, …"
//   + JSON IndicatorRecord[].
```

### `get_laos_welfare_data`

Inputs: `topic` (`education` | `nutrition` | `health` | `gender` | `wash` | `demography`),
`startYear?`, `endYear?`, `disaggregation?` (`sex` | `area` | `wealth` | `none`).

```jsonc
{ "topic": "nutrition", "disaggregation": "none" }
// → UNICEF nutrition IndicatorRecord[] (stunting, wasting, breastfeeding, …).
```

### `search_laos_datasets`

Inputs: `query`, `sources?` (default `["mekong","adb"]`), `topics?`, `maxResults?` (default 10, max 50).

```jsonc
{ "query": "agriculture", "maxResults": 5 }
// → DatasetMetadata[] from OD Mekong; ADB noted if unreachable (see caveat below).
```

### `compare_indicators`

Inputs: `indicators` (2–6 of `{ code, source?, label? }`), `startYear?` (default 2010),
`endYear?`, `outputFormat?` (`"markdown"` | `"table"` | `"json"`).

```jsonc
{ "indicators": [{ "code": "NY.GDP.PCAP.CD" }, { "code": "SE.ADT.LITR.ZS" }] }
// → aligned markdown table with one column per indicator.
```

### `get_source_status`

No inputs. Returns reachability, last-fetch time, and cache hit rate per source.

### `get_official_stats`

Inputs: `category?` (substring filter). Lists Lao Statistics Bureau categories plus
Laosis live-access status (stub until `LAOSIS_API_KEY` + a documented API exist).

### `get_laos_sdg_progress`

Inputs: `indicatorCode?` (e.g. `"3.1.1"` / `"18-1-1"`), `goal?` (1–18),
`search?`, `startYear?`, `endYear?`, `latestOnly?`.

```jsonc
{ "indicatorCode": "3.1.1", "startYear": 2015, "endYear": 2019 }
// → official LSB SDG IndicatorRecord[] for maternal mortality.
```

### Expansion-source tools

- **`get_laos_agriculture_data`** — `domain` (`QCL` | `FBS` | `FS` | `RL` | `FO`), `item?`, `startYear?`, `endYear?`. FAOSTAT.
- **`get_laos_health_data`** — `indicator?` (GHO code) or `search?` (name); omit both to list key indicators. WHO GHO.
- **`get_laos_macro_data`** — `indicator?` (IMF WEO code), `startYear?`, `endYear?`; omit indicator to list key indicators. IMF.
- **`get_laos_humanitarian_data`** — `topic?` (`population` | `food-security` | `poverty` | `operational-presence` | `funding` | `conflict`). HDX HAPI; needs `HDX_APP_ID`.
- **`search_laos_humanitarian_datasets`** — `query?`, `maxResults?`. HDX CKAN (no auth).
- **`get_laos_food_prices`** — `commodity?`, `market?`, `startDate?`, `endDate?`. WFP VAM; needs `WFP_CLIENT_ID`/`WFP_CLIENT_SECRET`.
- **`get_laos_infrastructure`** — `featureType` (`hospital` | `clinic` | `school` | `market` | `power_plant` | `river`), `province?`. OpenStreetMap.
- **`search_mekong_data`** — `topic?`. MRC catalog (stub; raw data needs `MRC_SESSION_TOKEN`).
- **`get_laos_census_data`** — `topic?`, `year?`. Bundled 2015 census; 2025 via `CENSUS_2025_AVAILABLE`.
- **`get_laos_sdg_progress`** — `indicatorCode?`, `goal?`, `search?`, `latestOnly?`. Official LSB SDG CSV export.

WHO, IMF, and LSB SDG codes also work through `get_laos_indicator` and `compare_indicators`.

## Resources

| URI                         | MIME               | Content                                                           |
| --------------------------- | ------------------ | ----------------------------------------------------------------- |
| `laos://indicators/catalog` | `application/json` | Curated catalog of all queryable indicators, grouped by category. |
| `laos://sources/status`     | `application/json` | Live connectivity + cache stats for each source.                  |

The catalog snapshot is also written to `src/catalog/indicators.json` by
`pnpm run refresh-catalog`.

## Prompts

| Name                 | Arguments                        | Produces                                                                                                        |
| -------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `policy_brief`       | `topic`, `audience`, `depth?`    | A structured brief: Executive Summary → Current Situation → Key Trends → Gaps & Recommendations → Data Sources. |
| `sector_comparison`  | `sector_a`, `sector_b`, `years?` | A side-by-side comparison of two sectors using `compare_indicators`.                                            |
| `data_audit`         | `topic`                          | An availability audit: what exists, coverage years, gaps, and next steps.                                       |
| `sdg_progress_audit` | `goal`, `audience?`              | A progress audit over official LSB SDG indicators plus corroborating sources.                                   |

Each prompt instructs the model to gather data via the tools above before writing, and to
cite the source and year for every figure.

## Data source reference

| Source                                                                                    | Base URL                                           | Auth         | Coverage                                                            | Update freq | Cache TTL |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------ | ------------------------------------------------------------------- | ----------- | --------- |
| [World Bank Indicators](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) | `api.worldbank.org/v2`                             | none         | Economy, demography, health, education, environment, infrastructure | ~annual     | 24h       |
| [UNICEF Data Warehouse (SDMX)](https://data.unicef.org/sdmx-api-documentation/)           | `sdmx.data.unicef.org/.../rest`                    | none         | Child welfare, nutrition, health, education, gender, WASH           | ~quarterly  | 12h       |
| [Open Development Mekong](https://data.laos.opendevelopmentmekong.net/)                   | `data.laos.opendevelopmentmekong.net/api/3/action` | none         | Agriculture, land, environment, investment (dataset files)          | varies      | 6h        |
| [ADB Data Library](https://data.adb.org/)                                                 | `data.adb.org/api/3/action`                        | none\*       | Finance, trade, infrastructure, SDGs                                | varies      | 12h       |
| [Laosis (Lao Statistics Bureau)](https://laosis.lsb.gov.la/)                              | `laosis.lsb.gov.la`                                | key (future) | Official national statistics (24 categories)                        | varies      | 1h        |
| [FAOSTAT](https://www.fao.org/faostat/en/#data)                                           | `fenixservices.fao.org/faostat/api/v1`             | none         | Crops, livestock, food balances, food security, land, forestry      | ~annual     | 24h       |
| [WHO GHO](https://www.who.int/data/gho/info/gho-odata-api)                                | `ghoapi.azureedge.net/api`                         | none         | Health (life expectancy, malaria, TB, NCDs, sanitation, …)          | varies      | 12h       |
| [IMF DataMapper](https://www.imf.org/external/datamapper/api/help)                        | `imf.org/external/datamapper/api/v2`               | none         | WEO macro (GDP, inflation, debt, current account)                   | ~biannual   | 24h       |
| [HDX / HAPI](https://hapi.humdata.org/docs)                                               | `data.humdata.org` + `hapi.humdata.org/api/v1`     | optional†    | Humanitarian datasets + indicators (population, IPC, funding, …)    | varies      | 6h        |
| [WFP VAM Data Bridges](https://api.wfp.org/)                                              | `gateway.api.wfp.org/vam-data-bridges/v1`          | OAuth2       | Market commodity prices, exchange rates, food security              | monthly     | 6h        |
| [OpenStreetMap (Overpass)](https://wiki.openstreetmap.org/wiki/Overpass_API)              | `overpass-api.de/api/interpreter`                  | none         | Infrastructure POIs (hospitals, schools, markets, power, rivers)    | continuous  | 7d        |
| [Mekong River Commission](https://portal.mrcmekong.org/)                                  | `portal.mrcmekong.org`                             | key‡         | Hydrology, fisheries, sediment, water quality (catalog stub)        | varies      | 24h       |
| [Lao Census (LSB)](https://lsb.gov.la/)                                                   | bundled                                            | none         | 2015 Population & Housing Census summary (2025 pending)             | decennial   | 24h       |
| [LSB SDG Open Data Platform](https://www.lsb.gov.la/sdg/en/)                              | `sdg-laos.github.io/data-production/en`            | none         | Official SDG indicators, including Lao national SDG 18 on UXO       | varies      | 24h       |

> **\* ADB caveat:** `data.adb.org` sits behind a Cloudflare bot challenge, so the JSON API
> is usually unreachable from non-browser clients. `search_laos_datasets` detects this and
> reports ADB as unavailable rather than failing the whole search — it is best-effort.

> **UNICEF note:** the SDMX warehouse uses the ISO3 country code `LAO`; this server
> normalizes it back to `LA` so all records share one country code.

> **† HDX:** the CKAN dataset catalog needs no auth; HAPI indicator values need a free
> `HDX_APP_ID` (no login — generate at <https://hapi.humdata.org/docs>).
> **‡ MRC:** the adapter is a stub exposing a static catalog; raw data needs free MRC
> registration (`MRC_SESSION_TOKEN`). **FAOSTAT** is occasionally down (Cloudflare 521).
> **LSB SDG:** the official Open SDG CSV export currently reports "Data last updated -
> Jun 26, 2021" on the LSB SDG homepage.

## Troubleshooting

| Symptom                                                  | Likely cause & fix                                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A tool returns "source unavailable" for ADB**          | `data.adb.org` sits behind a Cloudflare bot challenge and is usually unreachable from non-browser clients. This is expected — ADB is best-effort; the rest of the search still returns.                |
| **FAOSTAT agriculture calls fail intermittently**        | FAOSTAT occasionally returns a Cloudflare `521` (origin down). Retry later; it maps to a clean "source unavailable" error rather than crashing.                                                        |
| **A humanitarian/food-price/Laosis tool returns a stub** | Those sources need credentials. Set `HDX_APP_ID` (free), `WFP_CLIENT_ID`/`WFP_CLIENT_SECRET`, `MRC_SESSION_TOKEN`, or `LAOSIS_API_KEY` in `.env`. See [Environment variables](#environment-variables). |
| **An indicator returns no data**                         | Confirm the code with `list_available_indicators`. Not every indicator has Lao PDR coverage for every year; widen `startYear`/`endYear`.                                                               |
| **Empty results from a source you expect data from**     | Country codes differ per source (LA / LAO / area 116). The adapters handle this, but if you bypass them, check the [data source reference](#data-source-reference) notes.                              |
| **`Cannot find module './x'` after editing source**      | This is ESM + NodeNext: relative imports **must end in `.js`** (e.g. `import { x } from "./x.js"`). Run `pnpm typecheck`.                                                                              |
| **Nothing prints / the client sees corrupted JSON-RPC**  | On the stdio transport, stdout is the protocol channel. Never `console.log`; logs go to stderr via the logger. Set `LOG_LEVEL=debug` to see them.                                                      |
| **Want to see what's reachable right now**               | Call `get_source_status` (or read the `laos://sources/status` resource) for live reachability and cache hit rates per source.                                                                          |

## Requesting Laosis (LSB) access

[Laosis](https://laosis.lsb.gov.la/) is the official statistics portal of the **Lao
Statistics Bureau (LSB)**. It has no documented public REST API, so `laosis.ts` is a stub:
it exposes the known statistical categories and a reachability ping, and activates real
calls once `LAOSIS_API_KEY` is set and an API is available.

To request access:

1. Contact the Lao Statistics Bureau via <https://lsb.gov.la/> (Department of Data
   Management and Statistical Analysis).
2. Reference the World Bank statistical capacity-building / Lao Statistical System work
   when describing the civic-data interoperability use case.
3. Once granted, set `LAOSIS_API_KEY` in `.env` and implement the live calls marked
   `TODO(laosis-live)` in [`src/adapters/laosis.ts`](src/adapters/laosis.ts).

## Contributing

Contributions are welcome — especially **new data sources** about Lao PDR, which are the
highest-impact change and are designed to be purely additive (they never modify the
existing 14 sources or the shared schemas). Adding one follows an 8-file recipe:

1. **Adapter** — create `src/adapters/<source>.ts`. Export typed async functions that fetch
   and **normalize** into `IndicatorRecord` / `DatasetMetadata`. Never return raw API responses.
2. **Register the source** — add it to `SOURCES` / `SOURCE_META` / `SOURCE_ID_PREFIX` in
   [`src/schemas/source.ts`](src/schemas/source.ts) (base URL, cache TTL, timeout).
3. **Cache & HTTP** — fetch through `cache.getOrSet(...)` and `httpGet(...)` to inherit
   caching, retries, timeouts, and typed error mapping.
4. **Surface it** — register a fetcher and/or extend a tool, add a `ping*` to `getSourceStatus.ts`.
5. **Catalog** — add curated indicator entries to the seed in `src/catalog/`.
6. **Test** — adapter tests under `tests/adapters/` (`msw` mocks) + an integration test under `tests/tools/`.
7. **Document** — update the source reference table and note quirks in `CLAUDE.md`.
8. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check` before opening a PR.

Full details, house conventions, and the development setup are in
**[CONTRIBUTING.md](CONTRIBUTING.md)** and [`CLAUDE.md`](CLAUDE.md). Please also review the
**[Code of Conduct](CODE_OF_CONDUCT.md)**. To report a security issue, follow the
**[Security Policy](SECURITY.md)** rather than opening a public issue.

> Using an AI coding agent? This repo ships an `/add-data-source` skill and a `source-scout`
> agent under `.claude/` that encode the recipe above end to end.

## License

[MIT](LICENSE) © Aaron Chanthavong / Laos Civic Data Initiative
