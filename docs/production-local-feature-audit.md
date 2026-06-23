# Production-Local Feature Audit

Date: 2026-06-23

Scope: local, sanitized, production-like verification of the MCP user-facing
surface. No production deployment, destructive action, sensitive data access, or
credentialed upstream probing was approved or performed after the initial CLI
orientation. The authoritative local inventory is locked by
`tests/tools/featureInventory.test.ts`.

## Production-Like Local Settings

- Transport surface: in-memory MCP client/server for feature calls; HTTP
  security helpers covered by unit tests.
- Data: sanitized MSW fixtures and static bundled stub catalogs; no real
  credentials required.
- Reliability defaults: cache enabled, circuit breaker enabled, Zod validation
  enabled, logger writes to stderr only.
- User roles: MCP client user, analyst/researcher, government/civic data user,
  local developer/operator.
- Routes: stdio JSON-RPC transport and HTTP `POST /mcp`.
- Buttons/modals: not applicable; this is a headless MCP server. User actions
  are tool calls, resource reads, prompt renders, and transport requests.

## Acceptance Criteria By Surface

| Feature                             | Inputs                                                                  | Acceptance Criteria                                                                                                                         | Finite Risk Edge Cases                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `list_available_indicators`         | `source`, `category`, `search`                                          | Lists catalog entries by category with code, name, source, and unit; empty filters return a helpful no-match message.                       | Unknown category/search, unsupported source enum, empty catalog match.                  |
| `get_laos_indicator`                | `indicatorCode`, `source`, `startYear`, `endYear`, `format`             | Resolves source prefixes/catalog codes, returns normalized records or timeseries JSON, redirects dataset-only sources with a helpful error. | Invalid code, unsupported source, no data, upstream unavailable, inverted year range.   |
| `get_laos_welfare_data`             | `topic`, `startYear`, `endYear`, `disaggregation`                       | Fetches UNICEF SDMX records, supports national and disaggregated views, truncates large payloads safely.                                    | Unknown topic, no data, parse failure, inverted year range.                             |
| `search_laos_datasets`              | `query`, `sources`, `topics`, `maxResults`                              | Searches dataset catalogs, ignores indicator-only sources with a note, combines partial source failures.                                    | Empty results, ADB unavailable, topic filter removes all rows, max bounds.              |
| `compare_indicators`                | `indicators`, `startYear`, `endYear`, `outputFormat`                    | Fetches 2-6 series, aligns years, emits markdown/plain/json, preserves per-series notes.                                                    | Too few/many series, unsupported source, all series fail, inverted year range.          |
| `get_source_status`                 | none                                                                    | Reports all 21 sources with reachability, auth mode, cache stats, circuit state, and notes.                                                 | Source ping failure, credential-gated source absent, cache empty/non-empty.             |
| `get_official_stats`                | `category`                                                              | Lists Laosis categories and live-access/API-key status without pretending live API data exists.                                             | No category match, site unreachable, API key present but live API still stubbed.        |
| `get_laos_agriculture_data`         | `domain`, `item`, `startYear`, `endYear`                                | Returns FAOSTAT normalized records by domain/item, with empty-data and source errors humanized.                                             | Unknown domain, no item match, Cloudflare/source down, inverted year range.             |
| `get_laos_health_data`              | `indicator`, `search`                                                   | Lists key WHO indicators, searches codes, or fetches WHO records.                                                                           | No search match, no Lao data, malformed WHO response.                                   |
| `get_laos_macro_data`               | `indicator`, `startYear`, `endYear`                                     | Lists key IMF indicators or returns normalized WEO records.                                                                                 | Unknown code/no LAO values, forecast filtering, inverted year range.                    |
| `get_laos_humanitarian_data`        | `topic`                                                                 | Fetches HDX HAPI values only when `HDX_APP_ID` is available; otherwise returns a source error.                                              | Missing app id, unknown topic, empty HAPI rows.                                         |
| `search_laos_humanitarian_datasets` | `query`, `maxResults`                                                   | Searches public HDX catalog with Lao scoping and normalized metadata.                                                                       | Empty query, no results, max bounds, CKAN unavailable.                                  |
| `get_laos_food_prices`              | `commodity`, `market`, `startDate`, `endDate`                           | Fetches WFP prices only with OAuth credentials, filters records, validates ISO dates before credential/upstream work.                       | Missing credentials, malformed date, inverted date range, empty filter match.           |
| `get_laos_infrastructure`           | `featureType`, `province`                                               | Runs fixed OSM Overpass templates only and returns located features/counts.                                                                 | Unknown feature, province injection attempt, empty/capped result, Overpass unavailable. |
| `search_mekong_data`                | `topic`                                                                 | Lists MRC catalog metadata and registration/token caveat.                                                                                   | No topic match, token present but live downloads stubbed.                               |
| `get_laos_census_data`              | `topic`, `year`                                                         | Returns bundled census figures and 2025 availability note.                                                                                  | Unsupported year, no topic match, 2025 flag off/on.                                     |
| `get_laos_sdg_progress`             | `indicatorCode`, `goal`, `search`, `startYear`, `endYear`, `latestOnly` | Searches/list official LSB SDG indicators, fetches indicator or goal records, supports latest-only.                                         | Unknown code, empty goal/range, stale-source caveat, inverted year range.               |
| `get_laos_education_data`           | `indicator`, `search`                                                   | Lists/searches UIS indicators or fetches normalized education records.                                                                      | No search match, unknown code with hints, malformed response.                           |
| `get_laos_labor_data`               | `indicator`, `search`                                                   | Lists/searches ILOSTAT indicators or fetches normalized labor records.                                                                      | 404 no data, malformed SDMX, no search match.                                           |
| `get_laos_trade_data`               | `flow`, `breakdown`, `year`, `startYear`, `endYear`                     | Lists indicators on no input, returns total or partner Comtrade records with estimate caveats.                                              | Partner default year, no data, preview cap, inverted year range.                        |
| `get_laos_crime_data`               | `topic`                                                                 | Lists UNODC catalog links and clearly states no per-country API/no homicide data.                                                           | No topic match, static catalog only.                                                    |
| `get_laos_global_sdg_data`          | `indicatorCode`, `search`, `startYear`, `endYear`, `latestOnly`         | Lists curated UN SDG codes or fetches normalized Lao records.                                                                               | Legitimate empty Lao data, raw series code, inverted year range.                        |
| `search_laos_legal_texts`           | `query`, `type`, `maxResults`                                           | Searches FAOLEX scoped to country LAO and returns normalized legal metadata.                                                                | Empty query, type filter empty, malformed backend response, max bounds.                 |
| `get_laos_governance_data`          | `indicatorCode`, `search`, `startYear`, `endYear`                       | Lists/searches Data360 governance codes or fetches WGI estimate records.                                                                    | No search match, empty rows, source unavailable, inverted year range.                   |
| `laos://indicators/catalog`         | resource read                                                           | Returns JSON catalog with total count and grouped indicators.                                                                               | Catalog count drift, invalid JSON, missing required fields.                             |
| `laos://sources/status`             | resource read                                                           | Returns same source-status report shape as the status tool.                                                                                 | Ping failures, cache/circuit state visibility.                                          |
| Prompts                             | prompt args                                                             | Four prompts render task-specific guidance and name relevant tools.                                                                         | Missing required args, stale prompt/tool references.                                    |
| `POST /mcp`                         | HTTP JSON-RPC                                                           | Enforces auth when configured, loopback default, body limit, JSON parse handling, DNS rebinding controls.                                   | Missing/wrong bearer token, invalid JSON, over-limit body, bad host/origin.             |
| stdio transport                     | JSON-RPC stdio                                                          | Starts without stdout logging; operational logs go to stderr.                                                                               | Startup failure, accidental stdout writes.                                              |

## Bug Log And Evidence

| ID      | Finding                                                                                                                   | Reproduction Evidence                                                                                                                                                                        | Shared Cause                                                           | Fix                                                                    | Regression                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| BUG-001 | Time-series tools accepted inverted year windows, which could lead to confusing empty data or unnecessary upstream calls. | `pnpm ask call get_laos_indicator '{"indicatorCode":"SP.POP.TOTL","startYear":2024,"endYear":2020}'` attempted a public World Bank request during orientation instead of failing validation. | Tool schemas validated per-field bounds but not cross-field ordering.  | Added object-level Zod refinements to all public start/end year tools. | `tests/tools/featureInventory.test.ts` rejects inverted ranges for 9 tools before upstream data. |
| BUG-002 | `get_laos_food_prices` documented `YYYY-MM-DD` dates but accepted arbitrary strings until credential/upstream work.       | `pnpm ask call get_laos_food_prices '{"startDate":"not-a-date"}'` returned a WFP credential error instead of a date validation error.                                                        | Date fields used plain `z.string()` rather than Zod format validators. | Switched to `z.iso.date()` and added date ordering refinement.         | `tests/tools/featureInventory.test.ts` covers malformed and inverted WFP dates.                  |

## Rerun Evidence

- Inventory source: `pnpm ask list` returned 24 tools, 2 resources, and 4 prompts.
- Focused regression: `pnpm test tests/tools/featureInventory.test.ts` passed
  12 tests after fixes.
- Type safety: `pnpm typecheck` passed after schema changes.

## Open Risk

Live upstream reachability was not fully exercised because production/public API probing
was not approved for this goal. Use `get_source_status` with explicit approval when a
live-source availability audit is needed.
