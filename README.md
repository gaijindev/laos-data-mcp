# laos-data-mcp

A unified [Model Context Protocol](https://modelcontextprotocol.io) server that
connects five international and national data sources for **Lao PDR (Laos)** behind
one interface, normalizes their responses into a consistent schema, and exposes them
as MCP **tools**, **resources**, and **prompts**.

Instead of wiring up the World Bank, UNICEF, Open Development Mekong, ADB, and the Lao
Statistics Bureau separately every time, researchers, policymakers, civic technologists,
and AI agents can query Laos data through a single gateway.

> This project supports a broader civic-data initiative to improve data connectivity
> and interoperability for Laos, in alignment with the country's Digital Government
> Strategy and World Bank statistical capacity-building work.

## Status

🚧 Under active construction — see the build phases in the project history. The
sections below are filled in as each phase lands (full reference docs arrive in Phase 9).

## Prerequisites

- Node.js 18+ (developed on Node 26)
- [pnpm](https://pnpm.io) 10+
- No API keys required for the public sources (World Bank, UNICEF, OD Mekong).

## Installation

```bash
pnpm install
pnpm build
pnpm start          # launches the MCP server on stdio
```

For development without a build step:

```bash
pnpm dev
```

## Data sources

| Source | Adapter | Auth | Country code | Notes |
| ------ | ------- | ---- | ------------ | ----- |
| World Bank Indicators | `worldbank.ts` | none | `LA` | Annual development indicators |
| UNICEF SDMX | `unicef.ts` | none | `LAO` | Child welfare / health / education / WASH |
| Open Development Mekong | `mekong.ts` | none | — | CKAN dataset catalog |
| ADB Data Library | `adb.ts` | none | — | CKAN; Cloudflare-protected (best-effort) |
| Laosis (Lao Statistics Bureau) | `laosis.ts` | `LAOSIS_API_KEY` | — | Stub until access is granted |

## License

MIT — see [LICENSE](LICENSE).
