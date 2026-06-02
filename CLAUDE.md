# laos-data-mcp — Project Context for Claude Code

## What this project does

MCP server exposing 18 external data sources about Lao PDR as unified tools /
resources / prompts. See README.md for full architecture.

## Key conventions

- All adapters in `src/adapters/` must return normalized schemas from `src/schemas/`.
- Never return raw API responses from tools — always normalize first.
- All tool handlers must use try/catch and return human-readable errors (use
  `toToolError()` from `src/utils/errors.ts`), never raw stack traces.
- Cache every external API call through `src/cache/manager.ts`.
- Use Zod for ALL input validation — no manual type checking.
- ESM only (`"type": "module"`). Relative imports MUST end in `.js` (NodeNext).
- This is **Zod v4**: use top-level format validators (`z.url()`, `z.iso.datetime()`),
  not the deprecated `z.string().url()` / `z.string().datetime()` method forms.
- On the stdio transport, **never write to stdout** — it is the JSON-RPC channel.
  Log via `src/utils/logger.ts` (stderr only).

## Active data sources

1. World Bank (`worldbank.ts`) — REST JSON, no auth. Country code `LA`.
2. UNICEF SDMX (`unicef.ts`) — SDMX-JSON/XML, no auth. Country code `LAO` (ISO3).
3. OD Mekong CKAN (`mekong.ts`) — REST JSON, no auth.
4. ADB (`adb.ts`) — CKAN REST JSON, no auth, but Cloudflare-protected (see gotchas).
5. Laosis (`laosis.ts`) — STUB, activate with `LAOSIS_API_KEY`.
6. FAOSTAT (`faostat.ts`) — REST JSON, no auth. Area code `116`. Agriculture/food/forestry.
7. WHO GHO (`who.ts`) — OData JSON, no auth. Country `LAO`. Health indicators.
8. IMF DataMapper (`imf.ts`) — REST JSON, no auth. Country `LAO`. WEO macro.
9. HDX (`hdx.ts`) — CKAN (no auth) for datasets + HAPI (needs `HDX_APP_ID`) for indicators.
10. WFP VAM (`wfp.ts`) — OAuth2 client-credentials (`WFP_CLIENT_ID`/`WFP_CLIENT_SECRET`). Market prices.
11. OpenStreetMap (`osm.ts`) — Overpass POST, no auth. Infrastructure POIs; fixed templates only.
12. MRC (`mrc.ts`) — STUB, static catalog; activate with `MRC_SESSION_TOKEN`.
13. Census (`census.ts`) — STUB, bundled 2015 figures; 2025 via `CENSUS_2025_AVAILABLE`.
14. LSB SDG (`lsbSdg.ts`) — Open SDG static CSV/JSON export, no auth. Official SDG indicators.
15. UNESCO UIS (`uis.ts`) — REST JSON, no auth. Country `LAO`. Education indicators.
16. ILOSTAT (`ilostat.ts`) — SDMX-JSON, no auth. REF_AREA `LAO`. Labor indicators.
17. UN Comtrade (`comtrade.ts`) — REST JSON, keyless preview (optional `COMTRADE_API_KEY`).
    Reporter `418`. Trade exports/imports.
18. UNODC (`unodc.ts`) — STUB, static catalog; no per-country API (bulk Excel only). Crime/justice.

Adding a source is additive: append it to `SOURCES`/`SOURCE_META`/`SOURCE_ID_PREFIX`
in `src/schemas/source.ts`, add a `ping*` to `PINGS` in `getSourceStatus.ts`, and a
fetcher/tool. Existing sources and the record schemas are never modified.

## Running locally

```
pnpm install && pnpm build && pnpm start
```

Dev (no build step): `pnpm dev`

## Running tests

```
pnpm test             # all tests
pnpm test:watch       # watch mode
pnpm test:coverage    # with coverage report (80% line threshold)
```

## Before committing

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check
```

For coverage threshold verification:

```
pnpm test:coverage
```

## Known gotchas (verified against live APIs 2026-06)

- **World Bank returns a double-array**: `response.data[0]` is paging metadata,
  `response.data[1]` is the actual records array. Records use string `date`,
  numeric (nullable) `value`, and `indicator.id` / `country.id`.
- **UNICEF SDMX uses ISO3 `LAO`, not `LA`** — normalize back to `LA` on output.
  SDMX-JSON encodes series by dimension index (e.g. key `"0:1:1:2:..."`), so you
  must decode against `data.structures[].dimensions` — see `utils/sdmx.ts`.
- **OD Mekong CKAN** wraps every response in `{ success: boolean, result: ... }`
  and returns multilingual fields (`*_translated.{en,...}`).
- **ADB (data.adb.org) is behind a Cloudflare "Just a moment…" challenge.** Plain
  HTTP clients receive an HTML interstitial, not JSON. `adb.ts` detects this and
  raises `SourceUnavailableError`; ADB is therefore best-effort. Documented in README.
- **Laosis has no public API** — `laosis.ts` is a stub; see README for access steps.
- **FAOSTAT** intermittently returns Cloudflare **521** (origin down); maps to
  SourceUnavailableError. Field names are Title-Case with spaces ("Item Code", "Value").
- **IMF DataMapper ignores the country path segment** (returns all ~229 countries) — extract
  `values[code].LAO` client-side. WEO includes **forecast years > 2030**; filter them out.
- **WHO GHO** uses ISO3 `LAO`; values carry `NumericValue` + `Dim1` (sex) disaggregation.
- **HDX**: CKAN dataset search needs no auth; **HAPI indicator values need `HDX_APP_ID`**.
- **WFP VAM** needs OAuth2 (`WFP_CLIENT_ID`/`SECRET`); token is cached + refreshed (~1h expiry).
- **OSM Overpass** returns **HTTP 406** to clients with placeholder contact domains in the
  User-Agent or Brotli (`br`) compression. The shared HTTP client uses the project URL as
  User-Agent, and `osm.ts` overrides `Accept-Encoding` to `gzip, deflate`. Only fixed query
  templates are used; province input is sanitized.
- **UNESCO UIS** uses ISO3 `LAO`; envelope is `{ records, hints, indicatorMetadata }`.
  Codes are UPPERCASE/case-sensitive; an unknown code returns **HTTP 200 with `hints`**, not a
  4xx. There is **no `unit` field** — parse it from the trailing `(...)` of the metadata name.
- **ILOSTAT** is SDMX-JSON but has **no `INDICATOR` dimension** (the dataflow id is the indicator),
  so the shared `utils/sdmx.ts` decoder does not apply — `ilostat.ts` has its own decoder. REF_AREA
  is `LAO` (normalize to `LA`); requires `Accept: application/vnd.sdmx.data+json;version=1.0`;
  HTTP 404 means "no data" (treated as `[]`). Apply `UNIT_MULT` (×10^n) and map `UNIT_MEASURE`.
- **UN Comtrade**: use the **keyless `/public/v1/preview` endpoint** (capped at 500 records/response;
  `COMTRADE_API_KEY` unlocks the full endpoint). Reporter is **M49 `418`**; pass `motCode=0` or rows
  duplicate per transport mode; `primaryValue` is the USD value. **2017+ Lao values are UN mirror
  estimates** (`isReported=false`) — flagged in the footnote.
- **UNODC has no per-country API** — crime stats are bulk Excel only, with date-stamped URLs.
  `unodc.ts` is a static-catalog stub. Lao coverage is thin: trafficking (GLOTIP), prison (CTS),
  and drug treatment (WDR annex) only — **no homicide or violent-crime data for Laos**.

## Files to never modify without discussion

- `src/schemas/` — shared schemas; changing them ripples across every adapter.
- `CLAUDE.md` — update via explicit instruction only.
