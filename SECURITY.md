# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in laos-data-mcp, please report it **privately**.
Do not open a public issue, pull request, or discussion for security problems.

- **Preferred:** open a private advisory via GitHub Security Advisories at
  <https://github.com/gaijindev/laos-data-mcp/security/advisories/new>.
- **Email:** aaron.chann510@gmail.com with the subject line `SECURITY: laos-data-mcp`.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (a minimal proof of concept is ideal).
- Affected version or commit, and your environment if relevant.

We will acknowledge your report within **72 hours**, keep you updated on progress, and
credit you in the release notes once a fix ships (unless you prefer to remain anonymous).
Please give us a reasonable window to release a fix before any public disclosure.

## Scope

This server queries **public, read-only** upstream data APIs and exposes them over MCP. It
does not store user data or write to upstream sources. The most relevant areas for security
reports are:

- **The HTTP transport** (`MCP_TRANSPORT=http`). It supports bearer-token auth
  (`MCP_HTTP_AUTH_TOKEN`), a request body-size limit, and DNS-rebinding protection
  (Host/Origin allowlists). By default it binds to `127.0.0.1`. Reports about auth bypass,
  SSRF, DNS rebinding, or request-smuggling against this transport are in scope.
- **Credential handling.** Optional credentials (`HDX_APP_ID`, `WFP_CLIENT_ID/SECRET`,
  `LAOSIS_API_KEY`, `MRC_SESSION_TOKEN`) are read from the environment. The logger redacts
  credentials from all output. Reports of credential leakage are in scope.
- **Input validation.** All tool inputs are validated with Zod, and the OpenStreetMap
  Overpass templates sanitize province input. Reports of injection through tool inputs are
  in scope.

## Hardening guidance for operators

- Keep the HTTP transport bound to loopback unless you intentionally expose it; if you do,
  set `MCP_HTTP_AUTH_TOKEN` and configure `MCP_HTTP_ALLOWED_HOSTS` / `MCP_HTTP_ALLOWED_ORIGINS`.
- Never commit a real `.env`. Only `.env.example` (with empty values) is tracked.
- Run `pnpm audit --prod` to check dependencies; CI runs this on every build.

## Supported versions

This project is pre-1.x in spirit; security fixes are applied to the latest release on
`main`. Please upgrade to the latest version before reporting.
