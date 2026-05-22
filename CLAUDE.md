# laos-data-mcp — Project Context for Claude Code

## What this project does

MCP server exposing 5 external APIs about Lao PDR as unified tools / resources /
prompts. See README.md for full architecture.

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
pnpm lint && pnpm typecheck && pnpm test
```

## Known gotchas (verified against live APIs 2026-05)

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

## Files to never modify without discussion

- `src/schemas/` — shared schemas; changing them ripples across every adapter.
- `CLAUDE.md` — update via explicit instruction only.
