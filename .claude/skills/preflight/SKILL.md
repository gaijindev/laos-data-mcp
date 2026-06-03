---
name: preflight
description: >-
  Run the laos-data-mcp pre-commit quality gate (lint, typecheck, tests, and a
  build) and report pass/fail with a concise diagnosis of any failures. Use
  before committing or pushing, when the user asks to "check", "verify the
  build", "run the gate", or "is this ready to commit".
---

# Preflight gate

Runs the checks CLAUDE.md mandates before committing. Run them and summarize the
outcome — do not fix anything unless the user asks.

## Steps

Run in this order (stop reporting early failures first, since lint/typecheck are
fast and the test run is the slowest):

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If you want coverage too (CLAUDE.md sets an 80%-line threshold):

```
pnpm test:coverage
```

## Reporting

- On all-green: report a one-line PASS with the test count (e.g. "PASS — lint,
  typecheck, 136 tests, build all clean").
- On failure: name the failing stage, quote the smallest relevant excerpt
  (the failing test name + assertion, the tsc error with file:line, or the
  eslint rule + location), and give a one-line diagnosis. Don't paste the full
  log.
- Never use `--no-verify`, never skip a stage, and don't claim success for a
  stage you didn't run.

## Notes

- This project uses pnpm. If `pnpm` isn't on PATH in the current environment,
  surface that rather than silently switching to npm.
- Tests are fully mocked (MSW), so the gate does **not** require network access
  and runs anywhere. Live API reachability is a separate concern — use
  `get_source_status` for that.
