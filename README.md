# laos-data-mcp

[![CI](https://github.com/gaijindev/laos-data-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gaijindev/laos-data-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)
[![MCP](https://img.shields.io/badge/MCP-server-5E5CE6)](https://modelcontextprotocol.io)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for Lao PDR
data. It connects **21 international and national data sources**, normalizes their
responses, and exposes them as MCP tools, resources, and prompts that an AI assistant or
MCP client can use directly.

Instead of integrating World Bank, UNICEF, OD Mekong, ADB, Laosis, FAOSTAT, WHO, IMF,
HDX, WFP, OpenStreetMap, MRC, Census, LSB SDG, UNESCO UIS, ILOSTAT, UN Comtrade,
UNODC, UN Global SDG, FAOLEX, and Data360 one by one, this server gives researchers,
government analysts, civic technologists, and AI agents one consistent interface for Laos data.

## Contents

- [Government use cases](#government-use-cases)
- [What the server provides](#what-the-server-provides)
- [Quick start](#quick-start)
- [Run the MCP server](#run-the-mcp-server)
- [Example workflows](#example-workflows)
- [Tools](#tools)
- [Resources and prompts](#resources-and-prompts)
- [Data sources](#data-sources)
- [Configuration](#configuration)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Government use cases

This project is meant to make public data usable at the point of decision. A ministry,
province, donor coordination unit, or civic data team can ask an MCP-capable assistant for
evidence and receive normalized records with source names, indicator codes, years, units,
and caveats.

- **National planning and SDG reporting:** identify which official Lao SDG indicators have
  recent data, which are stale, and where international series can fill gaps. Useful tools:
  `get_laos_sdg_progress`, `get_laos_global_sdg_data`, `compare_indicators`.
- **Provincial service coverage:** compare mapped hospitals, clinics, schools, and markets
  against population or sector indicators. Useful tools: `get_laos_infrastructure`,
  `get_laos_indicator`, `get_laos_census_data`.
- **Food security and agriculture monitoring:** track crop production, food-security
  indicators, food prices, and humanitarian datasets. Useful tools:
  `get_laos_agriculture_data`, `get_laos_global_sdg_data`, `get_laos_food_prices`.
- **Housing, urban, and community planning:** inspect data on slums, public transport,
  public space, urban policies, and disaster losses. Useful tools: `get_laos_global_sdg_data`,
  `search_laos_humanitarian_datasets`.
- **Laws, regulations, and policy review:** find Lao legal texts for topics such as mining,
  land, food, forests, or water. Useful tools: `search_laos_legal_texts`,
  `get_laos_governance_data`.
- **Governance and institutional diagnostics:** monitor rule of law, regulatory quality,
  corruption control, and voice/accountability indicators. Useful tools:
  `get_laos_governance_data`, `get_laos_indicator`, `compare_indicators`.
- **Trade, labor, and macroeconomic briefings:** compare trade flows, GDP growth,
  inflation, labor participation, and employment. Useful tools: `get_laos_trade_data`,
  `get_laos_macro_data`, `get_laos_labor_data`.
- **Data readiness before a report or donor round:** check which sources are reachable,
  which topics have no data, and which indicators need caveats. Useful tools:
  `get_source_status`, `list_available_indicators`, `data_audit` prompt.

The important design choice is normalization: every numeric source is converted into the
same `IndicatorRecord` shape, and every catalog/document source is converted into
`DatasetMetadata`. An assistant can compare records across agencies without guessing field
names, country codes, or units.

## What the server provides

**Coverage:** 21 data sources, 24 tools, 2 resources, 4 prompts, and 236 catalog indicators.

Every adapter returns one of two normalized schemas:

- `IndicatorRecord` - one observation with source, indicator code, country, year, value,
  unit, footnote, and retrieval timestamp.
- `DatasetMetadata` - one dataset/catalog entry with title, source, topics, formats,
  download URL, license, and retrieval timestamp.

The server also includes:

- in-memory caching with per-source TTLs,
- HTTP retries with exponential backoff,
- circuit breakers for flaky upstream sources,
- Zod input validation for every tool,
- human-readable tool errors instead of raw stack traces,
- stdio and streamable HTTP MCP transports.

```
MCP client -> laos-data-mcp -> 21 adapters -> normalized records
                  |
                  +-> tools, resources, prompts
```

## Quick start

### Prerequisites

- Node.js 22.13+ for local development. The built server targets Node 18+, but the pnpm 11
  toolchain used by this repo needs modern Node.
- pnpm 10+. The repo now has a top-level `packageManager` field, so `corepack` can fetch
  the pinned pnpm version.

### Install and verify

```bash
git clone https://github.com/gaijindev/laos-data-mcp.git
cd laos-data-mcp
corepack enable
pnpm install
pnpm build
pnpm ask list
pnpm ask call get_source_status '{}'
pnpm ask call get_laos_indicator '{"indicatorCode":"SP.POP.TOTL"}'
```

If `get_laos_indicator` returns a Lao PDR population time series, the local setup works.
Live source reachability changes over time; `get_source_status` tells you what is reachable
right now.

## Run the MCP server

### 1. Built stdio server

Use this for Claude Desktop and most local MCP clients.

```bash
pnpm build
node /absolute/path/to/laos-data-mcp/dist/index.js
```

Generic MCP client config:

```json
{
  "mcpServers": {
    "laos-data": {
      "command": "node",
      "args": ["/absolute/path/to/laos-data-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 2. Source stdio server

Use this during development when you do not want to build first.

```json
{
  "mcpServers": {
    "laos-data": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/laos-data-mcp/src/index.ts"]
    }
  }
}
```

This repo also ships [`.claude/mcp.json`](.claude/mcp.json) for in-project Claude Code use.
Prefer `node dist/index.js` or `npx tsx src/index.ts` in MCP stdio client configs. `pnpm
dev` is a watch command for local development.

### 3. Codex

Codex Desktop and the Codex CLI can use this server as an MCP tool provider. Build the
server first if you want the stable compiled entry point:

```bash
pnpm build
```

Then add it with the Codex CLI:

```bash
codex mcp add laos-data --env LOG_LEVEL=info -- node /absolute/path/to/laos-data-mcp/dist/index.js
codex mcp list
```

You can also edit `~/.codex/config.toml` directly:

```toml
[mcp_servers.laos-data]
command = "node"
args = ["/absolute/path/to/laos-data-mcp/dist/index.js"]
startup_timeout_sec = 30

[mcp_servers.laos-data.env]
LOG_LEVEL = "info"
```

For source mode during development:

```bash
codex mcp add laos-data-dev -- npx tsx /absolute/path/to/laos-data-mcp/src/index.ts
```

Restart Codex after changing MCP configuration. In a Codex chat, ask directly for Laos
data tasks, for example:

```text
Use the laos-data MCP server to list available health indicators for Lao PDR.
Use the laos-data MCP server to summarize SDG goal 3 progress for Lao PDR with the latest records.
Use the laos-data MCP server to compare GDP per capita and adult literacy in Lao PDR from 2010 to 2024.
Use the laos-data MCP server to find hospital infrastructure in Vientiane and compare it with recent population trends.
```

If you prefer the HTTP transport, start the server as shown below and register the
endpoint:

```bash
export MCP_HTTP_AUTH_TOKEN=change-me
codex mcp add laos-data-http --url http://127.0.0.1:3000/mcp --bearer-token-env-var MCP_HTTP_AUTH_TOKEN
```

### 4. Local HTTP transport

Use this when an MCP client needs an HTTP endpoint instead of a child process. Keep it bound
to loopback unless you deliberately deploy it behind network controls.

```bash
pnpm build
MCP_TRANSPORT=http \
MCP_HTTP_HOST=127.0.0.1 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_AUTH_TOKEN=change-me \
pnpm start
```

Endpoint:

```text
http://127.0.0.1:3000/mcp
```

Clients should send `Authorization: Bearer change-me`. If `MCP_HTTP_AUTH_TOKEN` is empty,
the server warns on startup and the endpoint is unauthenticated.

### 5. No-client smoke harness

Use `pnpm ask` to call the real MCP server through an in-memory transport:

```bash
pnpm ask list
pnpm ask call list_available_indicators '{"category":"health"}'
pnpm ask call compare_indicators '{"indicators":[{"code":"NY.GDP.PCAP.CD"},{"code":"SE.ADT.LITR.ZS"}],"startYear":2010,"endYear":2024}'
```

## Example workflows

These examples use `pnpm ask` so they can run without a separate MCP client. In Claude,
Codex, or another MCP client, ask for the same tool calls in plain language.

### 1. National SDG briefing for a ministry

Use official Lao Statistics Bureau SDG data first, then compare with fresher global SDG
series where available.

```bash
pnpm ask call get_laos_sdg_progress '{"goal":3,"latestOnly":true}'
pnpm ask call get_laos_global_sdg_data '{"indicatorCode":"11.1.1","startYear":2020,"endYear":2024,"latestOnly":true}'
```

Government use: prepare a cabinet, ministry, or donor briefing that clearly separates
official Lao SDG platform data from international SDG estimates and flags stale or missing
series.

### 2. Provincial service coverage check

Combine mapped infrastructure with population or sector indicators.

```bash
pnpm ask call get_laos_infrastructure '{"featureType":"hospital","province":"Vientiane"}'
pnpm ask call get_laos_indicator '{"indicatorCode":"SP.POP.TOTL","startYear":2020,"endYear":2024}'
pnpm ask call get_laos_census_data '{"indicator":"URBAN_SHARE"}'
```

Government use: help a province or line ministry identify whether facility coverage,
urbanization, and population trends point to service gaps. The OSM adapter uses fixed
Overpass templates only; user input is sanitized and raw Overpass QL is never accepted.

### 3. Food security and agriculture scan

Pull production records, SDG food-security indicators, and supporting humanitarian
datasets.

```bash
pnpm ask call get_laos_agriculture_data '{"domain":"QCL","item":"Rice","startYear":2020,"endYear":2023}'
pnpm ask call get_laos_global_sdg_data '{"indicatorCode":"2.1.2","startYear":2018,"endYear":2024,"latestOnly":true}'
pnpm ask call search_laos_humanitarian_datasets '{"query":"food security","maxResults":5}'
```

Government use: support early warning, market-monitoring, or agriculture planning notes.
FAOSTAT can be slow or intermittently unavailable; the tool returns a clean source error
instead of crashing.

### 4. Housing, urban, and community planning

Use UN global SDG indicators for housing/community measures and search for related raw
datasets.

```bash
pnpm ask call list_available_indicators '{"source":"un_sdg","search":"housing"}'
pnpm ask call get_laos_global_sdg_data '{"indicatorCode":"11.1.1","startYear":2010,"endYear":2024}'
pnpm ask call search_laos_humanitarian_datasets '{"query":"shelter housing urban Laos","maxResults":5}'
```

Government use: prepare urban policy notes on slums, informal settlements, public
transport, open space, or disaster impacts on housing and infrastructure.

### 5. Legal and regulatory review

Search Lao legal texts, then pair the law/policy review with governance indicators.

```bash
pnpm ask call search_laos_legal_texts '{"query":"mining","type":"legislation","maxResults":5}'
pnpm ask call search_laos_legal_texts '{"query":"food","type":"all","maxResults":5}'
pnpm ask call get_laos_governance_data '{"indicatorCode":"GOV_WGI_RQ","startYear":2015,"endYear":2024}'
```

Government use: support legal inventory work before drafting amendments, reviewing sector
regulation, or comparing legal reforms with regulatory quality and rule-of-law indicators.

### 6. Governance and institutional diagnostics

Fetch Data360 governance indicators directly or compare several of them in one aligned
table.

```bash
pnpm ask call get_laos_governance_data '{"indicatorCode":"GOV_WGI_RL","startYear":2015,"endYear":2024}'
pnpm ask call compare_indicators '{"indicators":[{"code":"DATA360:GOV_WGI_RL","label":"Rule of law"},{"code":"DATA360:GOV_WGI_CC","label":"Control of corruption"},{"code":"DATA360:GOV_WGI_RQ","label":"Regulatory quality"}],"startYear":2015,"endYear":2024}'
```

Government use: brief public-administration reform, rule-of-law, or anti-corruption
programs with comparable annual indicators and explicit caveats.

### 7. Trade and economic context

Combine trade, macroeconomic, and labor indicators for economic-planning notes.

```bash
pnpm ask call get_laos_trade_data '{"flow":"exports","breakdown":"total","startYear":2018,"endYear":2024}'
pnpm ask call get_laos_macro_data '{"indicator":"NGDP_RPCH","startYear":2015,"endYear":2024}'
pnpm ask call get_laos_labor_data '{"indicator":"DF_UNE_DEAP_SEX_AGE_RT","startYear":2015,"endYear":2024}'
```

Government use: prepare economic context for budget planning, donor discussions, or trade
and labor-market analysis. UN Comtrade works through a keyless preview endpoint by
default; set `COMTRADE_API_KEY` for the full endpoint once that integration path is
enabled.

### 8. Data availability audit before publication

Before writing a report, check whether the topic has data and whether key sources are
reachable.

```bash
pnpm ask call get_source_status '{}'
pnpm ask call list_available_indicators '{"search":"maternal health"}'
pnpm ask call search_laos_datasets '{"query":"maternal health","maxResults":5}'
```

In an MCP client, run the `data_audit` prompt with a topic such as `maternal health`. The
prompt tells the model to discover indicators, inspect year coverage, search dataset
catalogs, check source health, and separate "no data exists" from "source temporarily
unreachable."

## Tools

| Tool                                | Purpose                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `list_available_indicators`         | Discover valid indicator codes by source, category, or search.     |
| `get_laos_indicator`                | Fetch one numeric time series from supported indicator sources.    |
| `get_laos_welfare_data`             | Fetch UNICEF welfare data by topic and disaggregation.             |
| `search_laos_datasets`              | Search OD Mekong, ADB, and optional FAOLEX dataset/legal catalogs. |
| `compare_indicators`                | Align 2-6 indicators into one comparison table.                    |
| `get_source_status`                 | Check source reachability, cache stats, and circuit state.         |
| `get_official_stats`                | List Lao Statistics Bureau official-statistics categories.         |
| `get_laos_agriculture_data`         | Fetch FAOSTAT agriculture, food, land, and forestry indicators.    |
| `get_laos_health_data`              | Fetch or search WHO Global Health Observatory indicators.          |
| `get_laos_macro_data`               | Fetch IMF DataMapper WEO macroeconomic indicators.                 |
| `get_laos_humanitarian_data`        | Fetch HDX HAPI humanitarian indicators when `HDX_APP_ID` is set.   |
| `search_laos_humanitarian_datasets` | Search the public HDX dataset catalog.                             |
| `get_laos_food_prices`              | Fetch WFP VAM food prices when WFP OAuth2 credentials are set.     |
| `get_laos_infrastructure`           | Query OpenStreetMap infrastructure through Overpass templates.     |
| `search_mekong_data`                | Browse the MRC catalog stub for hydrology and river datasets.      |
| `get_laos_census_data`              | Return bundled Lao census summary figures.                         |
| `get_laos_sdg_progress`             | Fetch official LSB SDG Platform indicators, including SDG 18.      |
| `get_laos_global_sdg_data`          | Fetch UN global SDG food, housing, community, law, and crime data. |
| `search_laos_legal_texts`           | Search FAOLEX for Lao laws, regulations, policies, and agreements. |
| `get_laos_governance_data`          | Fetch Data360 governance and rule-of-law indicators.               |
| `get_laos_education_data`           | Fetch or search UNESCO UIS education indicators.                   |
| `get_laos_labor_data`               | Fetch or search ILOSTAT labor indicators.                          |
| `get_laos_trade_data`               | Fetch UN Comtrade totals or partner breakdowns.                    |
| `get_laos_crime_data`               | Browse the UNODC crime and justice catalog stub.                   |

Common discovery and fetch flow:

```bash
pnpm ask call list_available_indicators '{"category":"education"}'
pnpm ask call get_laos_indicator '{"indicatorCode":"SP.DYN.LE00.IN","startYear":2010,"endYear":2022}'
pnpm ask call compare_indicators '{"indicators":[{"code":"NY.GDP.PCAP.CD","label":"GDP per capita"},{"code":"SP.POP.TOTL","label":"Population"}],"startYear":2010,"endYear":2024}'
```

Example normalized record:

```json
{
  "id": "WB:SP.POP.TOTL",
  "source": "worldbank",
  "indicatorCode": "SP.POP.TOTL",
  "indicatorName": "Population, total",
  "category": "demography",
  "countryCode": "LA",
  "countryName": "Lao PDR",
  "year": 2022,
  "value": 7559007,
  "retrievedAt": "2026-06-02T00:00:00.000Z"
}
```

## Resources and prompts

Resources:

| URI                         | MIME               | Content                                                      |
| --------------------------- | ------------------ | ------------------------------------------------------------ |
| `laos://indicators/catalog` | `application/json` | Curated catalog of queryable indicators grouped by category. |
| `laos://sources/status`     | `application/json` | Live connectivity, cache stats, and source notes.            |

Prompts:

| Name                 | Arguments                        | Produces                                                                |
| -------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `policy_brief`       | `topic`, `audience`, `depth?`    | A policy brief grounded in tool calls and source citations.             |
| `sector_comparison`  | `sector_a`, `sector_b`, `years?` | A side-by-side sector comparison using `compare_indicators`.            |
| `data_audit`         | `topic`                          | A data availability, freshness, and gap audit.                          |
| `sdg_progress_audit` | `goal`, `audience?`              | An official SDG progress audit with corroborating sources where useful. |

## Data sources

| Source                         | Access       | Coverage                                                     |
| ------------------------------ | ------------ | ------------------------------------------------------------ |
| World Bank Indicators          | public       | Economy, demography, health, education, environment          |
| UNICEF Data Warehouse          | public       | Child welfare, nutrition, health, education, gender, WASH    |
| Open Development Mekong        | public       | Dataset files on agriculture, land, environment, investment  |
| ADB Data Library               | best-effort  | Dataset catalog; often blocked by Cloudflare                 |
| Laosis / Lao Statistics Bureau | credentialed | Official statistics categories; live API stubbed             |
| FAOSTAT                        | public       | Crops, livestock, food balances, food security, land         |
| WHO GHO                        | public       | Health indicators                                            |
| IMF DataMapper                 | public       | WEO macroeconomic indicators                                 |
| HDX / HAPI                     | mixed        | Public dataset search; HAPI values need `HDX_APP_ID`         |
| WFP VAM                        | credentialed | Market commodity prices                                      |
| OpenStreetMap / Overpass       | public       | Infrastructure features                                      |
| Mekong River Commission        | stub         | Static hydrology, fisheries, and river catalog               |
| Lao Census                     | bundled      | 2015 census summary; 2025 path gated by env                  |
| LSB SDG Platform               | public       | Official SDG indicators, including national SDG 18           |
| UNESCO UIS                     | public       | Education indicators                                         |
| ILOSTAT                        | public       | Labor indicators                                             |
| UN Comtrade                    | public/opt   | Merchandise trade totals and partner breakdowns              |
| UNODC                          | stub         | Crime and justice catalog links                              |
| UN Global SDG Indicators       | public       | Food, agriculture, housing, community, law, crime indicators |
| FAOLEX                         | public       | Lao laws, regulations, policies, and legal-text metadata     |
| World Bank Data360             | public       | Governance, rule-of-law, and institutional indicators        |

Important source notes:

- World Bank returns a double-array: metadata first, records second.
- UNICEF and WHO use ISO3 `LAO`; outputs normalize country code back to `LA`.
- IMF DataMapper can return all countries; the adapter extracts `LAO` client-side and filters
  forecast years above 2030.
- ADB is behind a Cloudflare challenge and is treated as best-effort.
- FAOSTAT can intermittently return Cloudflare 521 or time out.
- Overpass rejects placeholder contact User-Agents and Brotli (`br`) compression in this
  environment; the OSM adapter uses the project URL as its User-Agent and disables `br`.
- LSB SDG is official but stale: the source homepage reports data last updated on
  June 26, 2021.
- UN Comtrade keyless preview responses are capped; Lao values from 2017 onward may be UN
  mirror estimates and are footnoted.
- UNODC exposes bulk files, not a per-country API, so the adapter is a catalog stub.
- UN Global SDG uses M49 area code `418` for Lao PDR; some indicators legitimately return
  empty Lao data arrays.
- FAOLEX is an official legal-text search backend but not a formally documented public API;
  the adapter scopes every query to country `LAO`.
- Data360 governance calls use ISO3 `LAO` and the curated WGI estimate breakdown; outputs
  normalize back to country code `LA`.

## Configuration

Copy `.env.example` to `.env` only when you need credentials or non-default transport
settings.

| Variable                   | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `LAOSIS_API_KEY`           | Enables future Laosis live API calls once access is granted. |
| `HDX_APP_ID`               | Enables HDX HAPI indicator values.                           |
| `WFP_CLIENT_ID`            | WFP VAM OAuth2 client id.                                    |
| `WFP_CLIENT_SECRET`        | WFP VAM OAuth2 client secret.                                |
| `MRC_SESSION_TOKEN`        | MRC portal token for future raw-data access.                 |
| `COMTRADE_API_KEY`         | Optional key for the full UN Comtrade endpoint.              |
| `CENSUS_2025_AVAILABLE`    | Set `true` only after 2025 census data is available.         |
| `CACHE_ENABLED`            | Set `false` to disable in-memory caching.                    |
| `CACHE_MAX_KEYS`           | Maximum in-memory cache keys.                                |
| `CIRCUIT_BREAKER_ENABLED`  | Set `false` to disable per-source circuit breakers.          |
| `MCP_TRANSPORT`            | `stdio` or `http`.                                           |
| `MCP_HTTP_HOST`            | HTTP bind host; defaults to loopback.                        |
| `MCP_HTTP_PORT`            | HTTP port; defaults to `3000`.                               |
| `MCP_HTTP_AUTH_TOKEN`      | Bearer token required by HTTP clients when set.              |
| `MCP_HTTP_ALLOWED_HOSTS`   | Comma-separated Host allowlist for HTTP transport.           |
| `MCP_HTTP_ALLOWED_ORIGINS` | Comma-separated Origin allowlist for HTTP transport.         |
| `LOG_LEVEL`                | `debug`, `info`, `warn`, or `error`; logs go to stderr.      |

Public/no-auth sources work without `.env`, subject to upstream availability.

## Development

```bash
pnpm install
pnpm dev
```

Quality gate:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm test:coverage
```

`pnpm test:coverage` enforces the line coverage threshold. Tests use MSW mocks, so the
quality gate does not depend on live upstream APIs. Live reachability is checked through
`get_source_status`.

The catalog snapshot is generated at `src/catalog/indicators.json`:

```bash
pnpm run refresh-catalog
```

## Troubleshooting

| Symptom                                                 | Likely cause and fix                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ADB reports unavailable                                 | Expected for many non-browser clients because `data.adb.org` is Cloudflare-protected. Other dataset results still return.       |
| FAOSTAT times out or returns source unavailable         | FAOSTAT is intermittently slow/down. Retry later; errors are mapped to a clean source-unavailable message.                      |
| HDX HAPI, WFP, MRC, or Laosis returns a credential note | Set the relevant optional credentials in `.env`. Public catalog/stub tools still work where available.                          |
| An indicator returns no records                         | Confirm the code with `list_available_indicators`; not every indicator has Lao coverage for every year.                         |
| MCP client sees corrupted JSON-RPC                      | Do not write to stdout on stdio. This server logs through `src/utils/logger.ts`, which writes to stderr.                        |
| HTTP transport returns 401                              | Send `Authorization: Bearer <MCP_HTTP_AUTH_TOKEN>` or clear the token for local unauthenticated testing.                        |
| HTTP transport rejects Host or Origin                   | Update `MCP_HTTP_ALLOWED_HOSTS` or `MCP_HTTP_ALLOWED_ORIGINS`, or disable DNS rebinding protection only in trusted deployments. |
| TypeScript cannot resolve a local import                | This repo is ESM/NodeNext; relative source imports must end in `.js`.                                                           |

## Requesting Laosis access

[Laosis](https://laosis.lsb.gov.la/) is the official statistics portal of the Lao
Statistics Bureau. It does not currently expose a documented public REST API, so the
adapter exposes known categories and activates live calls only when a future API/key path is
available.

To request access, contact the Lao Statistics Bureau via <https://lsb.gov.la/> and describe
the civic-data interoperability use case. Once access exists, set `LAOSIS_API_KEY` and
implement the live calls marked in `src/adapters/laosis.ts`.

## Contributing

Contributions are welcome, especially additional Lao PDR data sources. New sources should
be additive: add an adapter, register the source, cache every external call, normalize into
shared schemas, add tool/resource coverage, test with MSW, and document source quirks.

Before opening a PR:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and
[SECURITY.md](SECURITY.md). Additional project conventions live in [CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE) © Aaron Chanthavong / Laos Civic Data Initiative
