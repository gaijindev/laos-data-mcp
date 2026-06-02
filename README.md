# laos-data-mcp

[![CI](https://github.com/gaijindev/laos-data-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gaijindev/laos-data-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)
[![MCP](https://img.shields.io/badge/MCP-server-5E5CE6)](https://modelcontextprotocol.io)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for Lao PDR
data. It connects **18 international and national data sources**, normalizes their
responses, and exposes them as MCP tools, resources, and prompts that an AI assistant or
MCP client can use directly.

Instead of integrating World Bank, UNICEF, OD Mekong, ADB, Laosis, FAOSTAT, WHO, IMF,
HDX, WFP, OpenStreetMap, MRC, Census, LSB SDG, UNESCO UIS, ILOSTAT, UN Comtrade, and
UNODC one by one, this server gives researchers, government analysts, civic technologists,
and AI agents one consistent interface for Laos data.

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
province, donor coordination unit, or civic data team can use the MCP server to:

- **Prepare policy briefs** with cited indicators from World Bank, UNICEF, WHO, IMF,
  FAOSTAT, LSB SDG, and other sources.
- **Track SDG progress** using official Lao Statistics Bureau SDG Platform data, including
  national SDG 18 on UXO, while comparing against international sources where useful.
- **Audit data gaps** by topic, source, latest year, and source reachability before a
  report or planning cycle.
- **Compare sectors** such as health, education, agriculture, labor, trade, and macro
  conditions without writing one-off API integrations.
- **Map service coverage** by combining OpenStreetMap infrastructure features with
  population, census, health, and education indicators.
- **Monitor food security and markets** through FAOSTAT, WFP VAM, HDX, and agriculture
  indicators when credentials are available.
- **Support trade and labor analysis** through UN Comtrade, ILOSTAT, IMF, and World Bank
  indicators.

The important design choice is normalization: every numeric source is converted into the
same `IndicatorRecord` shape, so an assistant can compare records across agencies without
guessing field names, country codes, or units.

## What the server provides

**Coverage:** 18 data sources, 21 tools, 2 resources, 4 prompts, and 201 catalog indicators.

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
MCP client -> laos-data-mcp -> 18 adapters -> normalized records
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

### SDG progress briefing

```bash
pnpm ask call get_laos_sdg_progress '{"goal":3,"latestOnly":true}'
```

Use this to brief health-sector SDG progress with official LSB SDG data. In an MCP client,
combine it with the `sdg_progress_audit` prompt for a structured report.

### Provincial service coverage

```bash
pnpm ask call get_laos_infrastructure '{"featureType":"hospital","province":"Vientiane"}'
pnpm ask call get_laos_indicator '{"indicatorCode":"SP.POP.TOTL","startYear":2020,"endYear":2024}'
```

Use this to compare mapped facilities with population trends. The OSM adapter uses fixed
Overpass templates only; user input is sanitized and raw Overpass QL is never accepted.

### Food security and agriculture scan

```bash
pnpm ask call get_laos_agriculture_data '{"domain":"QCL","item":"Rice","startYear":2020,"endYear":2023}'
pnpm ask call search_laos_humanitarian_datasets '{"query":"food security","maxResults":5}'
```

Use this to gather agriculture production records and supporting humanitarian datasets.
FAOSTAT can be slow or intermittently unavailable; the tool returns a clean source error
instead of crashing.

### Trade and economic context

```bash
pnpm ask call get_laos_trade_data '{"flow":"exports","breakdown":"total","startYear":2018,"endYear":2024}'
pnpm ask call get_laos_macro_data '{"indicator":"NGDP_RPCH","startYear":2015,"endYear":2024}'
```

Use this for economic planning, trade partner summaries, and macroeconomic context. UN
Comtrade works through a keyless preview endpoint by default; set `COMTRADE_API_KEY` for
the full endpoint once that integration path is enabled.

### Data availability audit

In an MCP client, run the `data_audit` prompt with a topic such as:

```text
maternal health
```

The prompt tells the model to discover indicators, inspect year coverage, search dataset
catalogs, check source health, and separate "no data exists" from "source temporarily
unreachable."

## Tools

| Tool                                | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `list_available_indicators`         | Discover valid indicator codes by source, category, or search.   |
| `get_laos_indicator`                | Fetch one numeric time series from supported indicator sources.  |
| `get_laos_welfare_data`             | Fetch UNICEF welfare data by topic and disaggregation.           |
| `search_laos_datasets`              | Search OD Mekong and ADB dataset catalogs.                       |
| `compare_indicators`                | Align 2-6 indicators into one comparison table.                  |
| `get_source_status`                 | Check source reachability, cache stats, and circuit state.       |
| `get_official_stats`                | List Lao Statistics Bureau official-statistics categories.       |
| `get_laos_agriculture_data`         | Fetch FAOSTAT agriculture, food, land, and forestry indicators.  |
| `get_laos_health_data`              | Fetch or search WHO Global Health Observatory indicators.        |
| `get_laos_macro_data`               | Fetch IMF DataMapper WEO macroeconomic indicators.               |
| `get_laos_humanitarian_data`        | Fetch HDX HAPI humanitarian indicators when `HDX_APP_ID` is set. |
| `search_laos_humanitarian_datasets` | Search the public HDX dataset catalog.                           |
| `get_laos_food_prices`              | Fetch WFP VAM food prices when WFP OAuth2 credentials are set.   |
| `get_laos_infrastructure`           | Query OpenStreetMap infrastructure through Overpass templates.   |
| `search_mekong_data`                | Browse the MRC catalog stub for hydrology and river datasets.    |
| `get_laos_census_data`              | Return bundled Lao census summary figures.                       |
| `get_laos_sdg_progress`             | Fetch official LSB SDG Platform indicators, including SDG 18.    |
| `get_laos_education_data`           | Fetch or search UNESCO UIS education indicators.                 |
| `get_laos_labor_data`               | Fetch or search ILOSTAT labor indicators.                        |
| `get_laos_trade_data`               | Fetch UN Comtrade totals or partner breakdowns.                  |
| `get_laos_crime_data`               | Browse the UNODC crime and justice catalog stub.                 |

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

| Source                         | Access       | Coverage                                                    |
| ------------------------------ | ------------ | ----------------------------------------------------------- |
| World Bank Indicators          | public       | Economy, demography, health, education, environment         |
| UNICEF Data Warehouse          | public       | Child welfare, nutrition, health, education, gender, WASH   |
| Open Development Mekong        | public       | Dataset files on agriculture, land, environment, investment |
| ADB Data Library               | best-effort  | Dataset catalog; often blocked by Cloudflare                |
| Laosis / Lao Statistics Bureau | credentialed | Official statistics categories; live API stubbed            |
| FAOSTAT                        | public       | Crops, livestock, food balances, food security, land        |
| WHO GHO                        | public       | Health indicators                                           |
| IMF DataMapper                 | public       | WEO macroeconomic indicators                                |
| HDX / HAPI                     | mixed        | Public dataset search; HAPI values need `HDX_APP_ID`        |
| WFP VAM                        | credentialed | Market commodity prices                                     |
| OpenStreetMap / Overpass       | public       | Infrastructure features                                     |
| Mekong River Commission        | stub         | Static hydrology, fisheries, and river catalog              |
| Lao Census                     | bundled      | 2015 census summary; 2025 path gated by env                 |
| LSB SDG Platform               | public       | Official SDG indicators, including national SDG 18          |
| UNESCO UIS                     | public       | Education indicators                                        |
| ILOSTAT                        | public       | Labor indicators                                            |
| UN Comtrade                    | public/opt   | Merchandise trade totals and partner breakdowns             |
| UNODC                          | stub         | Crime and justice catalog links                             |

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
