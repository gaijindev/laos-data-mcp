# Contributing to laos-data-mcp

Thanks for your interest in improving laos-data-mcp. This project unifies data about
Lao PDR from many fragmented sources behind one [Model Context Protocol](https://modelcontextprotocol.io)
interface, and contributions — especially **new data sources** — are very welcome.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Add a new data source** about Lao PDR (see the recipe below) — the highest-impact
  contribution, and the project is designed to make it purely additive.
- **Improve an existing adapter** — better coverage, more indicators, fixed quirks.
- **Curate the indicator catalog** — add or correct entries in `src/catalog/`.
- **Fix bugs, improve docs, or tighten tests.**

## Development setup

```bash
git clone https://github.com/gaijindev/laos-data-mcp.git
cd laos-data-mcp
pnpm install
cp .env.example .env   # optional — all values are optional
pnpm dev               # run from source, no build step
```

- **Node.js 22.13+** and **[pnpm](https://pnpm.io) 10+** are required for development (the
  pnpm 11 toolchain needs Node 22.13+). The built server itself runs on Node 18+.
- This is an **ESM-only** project (`"type": "module"`). With NodeNext resolution, all
  relative imports **must end in `.js`**.
- We use **Zod v4** for all input validation — use the top-level format validators
  (`z.url()`, `z.iso.datetime()`), not the deprecated `z.string().url()` forms.

## The quality gate

Every change must pass the same gate that CI enforces. Run it before opening a PR:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm format:check      # Prettier — run `pnpm format` to auto-fix
pnpm test:coverage     # enforces ≥80% line coverage
```

You can exercise the running server without an MCP client via the in-memory harness:

```bash
pnpm ask list
pnpm ask call get_laos_indicator '{"indicatorCode":"SP.POP.TOTL"}'
```

## House conventions

These are enforced by review (and most by lint/types). See [`CLAUDE.md`](CLAUDE.md) for the
full list and the per-source gotchas verified against the live APIs.

- **Always normalize.** Adapters in `src/adapters/` must return the shared schemas from
  `src/schemas/` (`IndicatorRecord` / `DatasetMetadata`). Never return a raw API response
  from a tool.
- **Cache every external call** through `src/cache/manager.ts`, and make HTTP requests
  through `src/utils/http.ts` so you inherit retries, timeouts, and typed error mapping.
- **Human-readable errors only.** Tool handlers use `try/catch` and return errors via
  `toToolError()` from `src/utils/errors.ts` — never raw stack traces.
- **Never write to stdout on the stdio transport** — it is the JSON-RPC channel. Log
  through `src/utils/logger.ts`, which writes to stderr and redacts credentials.
- **Don't modify `src/schemas/`** without discussion — changing the shared schemas ripples
  across every adapter. Adding a source should never require touching them.

## Adding a data source (the 8-file recipe)

Adding a source is **additive** — it appends to the registries and never modifies the
existing sources or the shared record schemas.

1. **Adapter** — create `src/adapters/<source>.ts`. Export typed async functions that fetch
   and **normalize** into `IndicatorRecord` / `DatasetMetadata`.
2. **Register the source** — append it to `SOURCES` / `SOURCE_META` / `SOURCE_ID_PREFIX` in
   [`src/schemas/source.ts`](src/schemas/source.ts) (base URL, cache TTL, timeout).
3. **Cache & HTTP** — fetch through `cache.getOrSet(...)` and the shared HTTP client.
4. **Surface it** — register a fetcher (`registerIndicatorFetcher`) and/or add a tool under
   `src/tools/`, and add a `ping*` to `PINGS` in `getSourceStatus.ts`.
5. **Catalog** — add curated indicator entries to the seed in `src/catalog/`.
6. **Test** — add adapter tests under `tests/adapters/` using `msw` mocks, plus an
   integration test under `tests/tools/` via the in-memory client harness.
7. **Document** — add the source to the data-source reference table and the active-sources
   list, and note any quirks in `CLAUDE.md`.
8. **Run the quality gate** before opening the PR.

> Tip: this repo ships a `/add-data-source` skill and a `source-scout` agent under
> `.claude/` that encode this recipe end to end if you use Claude Code.

## Pull requests

- Branch from `main`; keep PRs focused on one logical change.
- Write a clear description of **what** changed and **why**. If you added a source, note
  whether it needs credentials and link the upstream API docs.
- Make sure the quality gate is green — CI runs lint, typecheck, coverage, and build on
  every PR.
- Be responsive to review feedback. Maintainers may request changes to keep adapters
  consistent with the existing ones.

## Reporting bugs and requesting features

Open an [issue](https://github.com/gaijindev/laos-data-mcp/issues) using the appropriate
template. For anything security-related, follow [SECURITY.md](SECURITY.md) instead of
filing a public issue.

## License

By contributing, you agree that your contributions will be licensed under the project's
[MIT License](LICENSE).
