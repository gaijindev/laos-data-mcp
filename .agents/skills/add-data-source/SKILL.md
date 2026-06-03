---
name: add-data-source
description: >-
  Add a new external data source to laos-data-mcp end-to-end. Use when the user
  wants to integrate a new API/dataset about Lao PDR (e.g. ILO, UNESCO UIS, ITU,
  UNDP HDI, UN Comtrade, ReliefWeb) as an MCP tool, or says "add a source",
  "wire up <provider>", or "expose <dataset>". Encodes the project's additive
  8-file recipe and house conventions so the new source matches the existing 18.
---

# Add a data source to laos-data-mcp

Integrating a source is **purely additive**: append to the registries, add an
adapter + tool, register it, seed the catalog, and test. **Never modify the
shared record schemas in `src/schemas/{indicator,dataset}.ts` or existing
adapters** — that ripples across every source.

Before starting you need an integration spec for the source (endpoints, auth,
the Lao country/area code, response shape, and gotchas). If you don't have one,
ask the user — or delegate research to the `source-scout` agent first.

## Non-negotiable conventions

- **ESM + NodeNext**: every relative import MUST end in `.js` (e.g. `"../utils/http.js"`).
- **Zod v4**: use top-level format validators (`z.url()`, `z.iso.datetime()`),
  never the deprecated `z.string().url()` forms. Validate ALL tool input with Zod.
- **Normalize, never passthrough**: tools must return the shared schema types
  from `src/schemas/`, never raw upstream JSON.
- **All HTTP goes through `src/utils/http.ts`** (`httpGet`/`httpPost`). That gives
  you per-source timeout, retry, and the circuit breaker for free. Do not import
  axios directly.
- **Cache every external call** via `cache.getOrSet(source, keyParts, fetcher)`
  from `src/cache/manager.ts`.
- **Errors**: wrap tool handler bodies in `try/catch` and return
  `toToolError(err, { subject })` from `src/utils/errors.ts`. Throw the typed
  errors (`SourceUnavailableError`, `InvalidIndicatorError`, `DataParseError`)
  from the adapter — never raw strings or stack traces.
- **stdio is sacred**: never `console.log`/write to stdout. Log via
  `src/utils/logger.ts` (stderr only).
- For indicator time-series sources, normalize the Lao country code back to `LA`
  on output even if the upstream uses `LAO`/a numeric code.

## The recipe (8 touchpoints)

Use the most recently added source as a live template (e.g. WHO:
`src/adapters/who.ts`, `src/tools/getHealthData.ts`, `tests/adapters/who.test.ts`,
`tests/mocks/who.mock.ts`).

1. **`src/schemas/source.ts`** — add the id to `SOURCES`, a full entry to
   `SOURCE_META` (baseUrl, `cacheTtlSeconds`, `timeoutMs`, `auth`, `kind`,
   `docsUrl`), and a short uppercase prefix to `SOURCE_ID_PREFIX`.
2. **`src/adapters/<name>.ts`** — export a `fetch<Name>...` that calls
   `cache.getOrSet(...)` → `httpGet`/`httpPost`, validates/decodes the response
   (throw `DataParseError` on unexpected shape), and maps to normalized records.
   Also export a `ping<Name>(): Promise<boolean>` reachability probe.
3. **`src/tools/get<X>Data.ts`** — a `register<...>Tool(server)` that registers
   one MCP tool with a Zod `inputSchema`, a clear `description`, and the
   `try/catch → toToolError` body. Use `jsonResult`/`textResult` from
   `src/utils/result.js`.
4. **`src/server.ts`** — call the new `register...Tool(server)` in `createServer`.
   If the source serves codes resolvable through `get_laos_indicator`, also wire
   `registerIndicatorFetcher("<source>", ...)`.
5. **`src/tools/getSourceStatus.ts`** — add the source to `PINGS` (and a `NOTES`
   entry if it has auth/availability caveats).
6. **`src/catalog/seed.expansion.ts`** — add `CatalogEntry` rows so the source's
   indicators/domains are discoverable via `list_available_indicators`.
7. **Tests + mocks** — `tests/mocks/<name>.mock.ts` (MSW handlers + sample
   payloads mirroring the live shape) and `tests/adapters/<name>.test.ts`
   covering: success normalization, empty result, invalid/parse-error, and a
   transport failure. The global `tests/setup.ts` already resets cache +
   breakers between tests. New code must keep coverage ≥ thresholds (80% lines).
8. **Refresh the catalog snapshot**: `pnpm refresh-catalog` regenerates
   `src/catalog/indicators.json`.

## AGENTS.md

If the source has a notable quirk (auth, Cloudflare, odd country code, forecast
filtering, response envelope), add a one-line entry under "Active data sources"
and "Known gotchas" in `AGENTS.md`. AGENTS.md is edit-on-explicit-instruction —
mention the proposed lines to the user rather than editing silently.

## Definition of done

Run the full gate and confirm green before reporting completion:

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check
```

Then sanity-check the wiring offline:

```
pnpm ask call get_source_status '{}'        # new source appears in the list
pnpm ask call list_available_indicators '{}' # new catalog entries show up
```

Live verification (`pnpm ask call <new_tool> '{...}'`) requires network egress to
the source host; note if the environment's network policy blocks it.
