# laos-data-mcp

A unified [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that
connects international and national data sources for **Lao PDR (Laos)** behind one
interface, normalizes their responses into a consistent schema, and exposes them as MCP
**tools**, **resources**, and **prompts**.

Instead of wiring up the World Bank, UNICEF, Open Development Mekong, ADB, and the Lao
Statistics Bureau separately every time, researchers, policymakers, civic technologists,
and AI agents can query Laos data through a single gateway.

> This project supports a broader civic-data initiative to improve data connectivity and
> interoperability for Laos, in alignment with the country's Digital Government Strategy
> and World Bank statistical capacity-building work.

## Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation & setup](#installation--setup)
- [Claude integration](#claude-integration)
- [Tools](#tools)
- [Resources](#resources)
- [Prompts](#prompts)
- [Data source reference](#data-source-reference)
- [Requesting Laosis (LSB) access](#requesting-laosis-lsb-access)
- [Contributing — add a data source](#contributing--add-a-data-source)
- [License](#license)

## Overview

Every adapter normalizes its source into one of two shared shapes:

- **`IndicatorRecord`** — a single observation: `{ id, source, indicatorCode, indicatorName,
category, countryCode: "LA", countryName: "Lao PDR", year, value, unit?, footnote?, retrievedAt }`.
- **`DatasetMetadata`** — a catalog entry pointing at downloadable files: `{ id, source, title,
description?, topics[], formats[], downloadUrl?, lastUpdated?, license?, retrievedAt }`.

Responses are cached in-memory with per-source TTLs, HTTP calls retry with exponential
backoff, and every tool returns human-readable errors (never raw stack traces).

```
MCP client ──> laos-data-mcp ──> adapters ──> { World Bank, UNICEF, OD Mekong, ADB, Laosis }
                    │                └─ normalize ─> IndicatorRecord / DatasetMetadata
                    └─ tools • resources • prompts
```

## Prerequisites

- **Node.js 18+** (developed and tested on Node 26)
- **[pnpm](https://pnpm.io) 10+**
- No API keys are required for the public sources (World Bank, UNICEF, OD Mekong).

## Installation & setup

```bash
git clone <your-fork-or-this-repo> laos-data-mcp
cd laos-data-mcp
pnpm install
cp .env.example .env   # optional — all values are optional
pnpm build
pnpm start             # launches the MCP server on stdio
```

Development (no build step, auto-reload):

```bash
pnpm dev
```

Quality gates:

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm test:coverage     # enforces the coverage thresholds (≥80% lines)
```

### Environment variables

All are optional — see [`.env.example`](.env.example). Highlights:

| Variable         | Default | Purpose                                                     |
| ---------------- | ------- | ----------------------------------------------------------- |
| `LAOSIS_API_KEY` | —       | Enables the Laosis adapter once LSB grants API access.      |
| `CACHE_ENABLED`  | `true`  | Set `false` to disable caching (useful during development). |
| `MCP_TRANSPORT`  | `stdio` | `stdio` (local) or `http` (remote deployment).              |
| `MCP_HTTP_PORT`  | `3000`  | Port for the HTTP transport.                                |
| `LOG_LEVEL`      | `info`  | `debug` \| `info` \| `warn` \| `error` (logs go to stderr). |

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

| Tool                        | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `list_available_indicators` | Discover valid indicator codes (catalog browse).      |
| `get_laos_indicator`        | Time series for one indicator (World Bank / UNICEF).  |
| `get_laos_welfare_data`     | UNICEF welfare data by topic, with disaggregation.    |
| `search_laos_datasets`      | Search dataset files across OD Mekong + ADB.          |
| `compare_indicators`        | Merge 2–6 indicators into one aligned table.          |
| `get_source_status`         | Health + cache stats for all sources.                 |
| `get_official_stats`        | Lao Statistics Bureau official-statistics categories. |

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

## Resources

| URI                         | MIME               | Content                                                           |
| --------------------------- | ------------------ | ----------------------------------------------------------------- |
| `laos://indicators/catalog` | `application/json` | Curated catalog of all queryable indicators, grouped by category. |
| `laos://sources/status`     | `application/json` | Live connectivity + cache stats for each source.                  |

The catalog snapshot is also written to `src/catalog/indicators.json` by
`pnpm run refresh-catalog`.

## Prompts

| Name                | Arguments                        | Produces                                                                                                        |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `policy_brief`      | `topic`, `audience`, `depth?`    | A structured brief: Executive Summary → Current Situation → Key Trends → Gaps & Recommendations → Data Sources. |
| `sector_comparison` | `sector_a`, `sector_b`, `years?` | A side-by-side comparison of two sectors using `compare_indicators`.                                            |
| `data_audit`        | `topic`                          | An availability audit: what exists, coverage years, gaps, and next steps.                                       |

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

> **\* ADB caveat:** `data.adb.org` sits behind a Cloudflare bot challenge, so the JSON API
> is usually unreachable from non-browser clients. `search_laos_datasets` detects this and
> reports ADB as unavailable rather than failing the whole search — it is best-effort.

> **UNICEF note:** the SDMX warehouse uses the ISO3 country code `LAO`; this server
> normalizes it back to `LA` so all records share one country code.

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

## Contributing — add a data source

1. **Adapter** — create `src/adapters/<source>.ts`. Export typed async functions that
   fetch and **normalize** into `IndicatorRecord` / `DatasetMetadata` (from `src/schemas/`).
   Never return raw API responses.
2. **Register the source** — add it to `SOURCES` / `SOURCE_META` in
   [`src/schemas/source.ts`](src/schemas/source.ts) (base URL, cache TTL, timeout).
3. **Cache & HTTP** — fetch through `cache.getOrSet(...)` and `httpGet(...)` so you inherit
   caching, retries, timeouts, and typed error mapping.
4. **Surface it** — register a fetcher (`registerIndicatorFetcher`) and/or extend a tool,
   and add curated entries to the catalog seed in `src/catalog/`.
5. **Test** — add adapter tests under `tests/adapters/` using `msw` mocks, and an
   integration test under `tests/tools/` via the in-memory client harness.
6. Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.

See [`CLAUDE.md`](CLAUDE.md) for conventions and known gotchas.

## License

[MIT](LICENSE) © Laos Civic Data Initiative
