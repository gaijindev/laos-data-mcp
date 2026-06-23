## What changed

<!-- Explain what changed and why. If this adds a data source, link the upstream docs and note whether credentials are required. -->

## Quality gate

- [ ] I ran `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check`.
- [ ] I added or updated focused tests for the changed behavior, or this change is docs-only.
- [ ] I updated README, CONTRIBUTING, catalog docs, or source notes when behavior changed.

## Data source checklist

<!-- Complete this section when adding or changing a data source; otherwise mark it not applicable. -->

- [ ] Adapter responses normalize to `IndicatorRecord` or `DatasetMetadata`; no raw upstream responses are returned by tools.
- [ ] External calls go through `src/cache/manager.ts` and `src/utils/http.ts`.
- [ ] Inputs are validated with Zod and errors are returned through `toToolError()`.
- [ ] Source registry, tool/fetcher wiring, catalog entries, tests, and documentation are all updated.
- [ ] Upstream quirks, auth requirements, cache TTL, and source license/reuse terms are documented.

## Notes for reviewers

<!-- Call out tradeoffs, follow-up work, or source behavior that reviewers should inspect closely. -->
