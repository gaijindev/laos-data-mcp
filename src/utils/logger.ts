/**
 * Minimal level-gated logger.
 *
 * IMPORTANT: every log goes to stderr. On the stdio transport, stdout is the
 * JSON-RPC channel — writing anything else there corrupts the MCP stream.
 *
 * All output is passed through redaction so credentials never reach the logs,
 * even if a caller hands us a raw axios error (whose `config.headers` can carry
 * an Authorization bearer token) or a URL with an API key in the query string.
 */

const LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LEVELS)[number];

/** Env vars whose values must never appear in logs. */
const SENSITIVE_ENV_VARS = [
  "WFP_CLIENT_ID",
  "WFP_CLIENT_SECRET",
  "HDX_APP_ID",
  "LAOSIS_API_KEY",
  "ADB_API_KEY",
  "COMTRADE_API_KEY",
  "MRC_SESSION_TOKEN",
  "MCP_HTTP_AUTH_TOKEN",
] as const;

const REDACTED = "***";

function resolveLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return (LEVELS as readonly string[]).includes(raw ?? "") ? (raw as LogLevel) : "info";
}

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const threshold = ORDER[resolveLevel()];

/** Current secret values worth scrubbing. Read live so runtime config is covered. */
function sensitiveValues(): string[] {
  const values: string[] = [];
  for (const name of SENSITIVE_ENV_VARS) {
    const value = process.env[name]?.trim();
    // Ignore trivially short values to avoid nuking unrelated text.
    if (value && value.length >= 4) values.push(value);
  }
  return values;
}

function redactString(input: string): string {
  let out = input.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`);
  for (const secret of sensitiveValues()) {
    out = out.split(secret).join(REDACTED);
  }
  return out;
}

/**
 * Redact one log argument. Errors are reduced to name/message/stack so we never
 * serialize an axios error's `config`/`request`/`response` (which hold headers
 * and the bearer token); the resulting text is then scrubbed for secrets too.
 */
function redactArg(arg: unknown): unknown {
  if (typeof arg === "string") return redactString(arg);
  if (arg instanceof Error) return redactString(arg.stack ?? `${arg.name}: ${arg.message}`);
  if (arg !== null && typeof arg === "object") {
    try {
      return redactString(JSON.stringify(arg));
    } catch {
      return redactString(String(arg));
    }
  }
  return arg;
}

function emit(level: LogLevel, args: unknown[]): void {
  if (ORDER[level] < threshold) return;
  const prefix = `[laos-data-mcp] ${new Date().toISOString()} ${level.toUpperCase()}`;
  console.error(prefix, ...args.map(redactArg));
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", args),
  info: (...args: unknown[]) => emit("info", args),
  warn: (...args: unknown[]) => emit("warn", args),
  error: (...args: unknown[]) => emit("error", args),
};
