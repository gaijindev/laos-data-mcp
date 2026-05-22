/**
 * Minimal level-gated logger.
 *
 * IMPORTANT: every log goes to stderr. On the stdio transport, stdout is the
 * JSON-RPC channel — writing anything else there corrupts the MCP stream.
 */

const LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LEVELS)[number];

function resolveLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return (LEVELS as readonly string[]).includes(raw ?? "") ? (raw as LogLevel) : "info";
}

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const threshold = ORDER[resolveLevel()];

function emit(level: LogLevel, args: unknown[]): void {
  if (ORDER[level] < threshold) return;
  const prefix = `[laos-data-mcp] ${new Date().toISOString()} ${level.toUpperCase()}`;
  console.error(prefix, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", args),
  info: (...args: unknown[]) => emit("info", args),
  warn: (...args: unknown[]) => emit("warn", args),
  error: (...args: unknown[]) => emit("error", args),
};
