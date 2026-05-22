import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Source } from "../schemas/source.js";

/** Base class for any error tied to a specific data source. */
export class SourceError extends Error {
  readonly source: Source;
  constructor(source: Source, message: string) {
    super(message);
    this.name = new.target.name;
    this.source = source;
  }
}

/** An upstream API is unreachable, errored, or returned a non-data response. */
export class SourceUnavailableError extends SourceError {
  readonly reason: string;
  constructor(source: Source, reason: string) {
    super(source, `Source "${source}" is unavailable: ${reason}`);
    this.reason = reason;
  }
}

/** A requested indicator code does not exist in the given source. */
export class InvalidIndicatorError extends SourceError {
  readonly code: string;
  constructor(code: string, source: Source) {
    super(source, `Indicator "${code}" was not found in source "${source}".`);
    this.code = code;
  }
}

/** The source returned HTTP 429. `retryAfter` is in seconds when known. */
export class RateLimitError extends SourceError {
  readonly retryAfter?: number;
  constructor(source: Source, retryAfter?: number) {
    super(
      source,
      `Source "${source}" rate-limited the request${
        retryAfter !== undefined ? ` (retry after ${retryAfter}s)` : ""
      }.`,
    );
    this.retryAfter = retryAfter;
  }
}

/** The response could not be parsed into the expected shape. */
export class DataParseError extends SourceError {
  readonly rawSample?: string;
  constructor(source: Source, rawResponse?: unknown) {
    super(source, `Source "${source}" returned data in an unexpected format.`);
    this.rawSample =
      typeof rawResponse === "string" ? rawResponse.slice(0, 300) : undefined;
  }
}

export interface ToolErrorContext {
  /** What the caller was trying to fetch, e.g. an indicator code or query. */
  subject?: string;
}

/**
 * Turn any thrown value into a single human-readable line for an MCP tool
 * result — never a raw stack trace. Includes a concrete "Try:" suggestion so
 * the model can recover.
 */
export function toToolErrorMessage(err: unknown, ctx: ToolErrorContext = {}): string {
  const subject = ctx.subject ? ` "${ctx.subject}"` : "";

  if (err instanceof SourceUnavailableError) {
    return `Error fetching${subject} from ${err.source}: ${err.reason}. Try: call get_source_status to confirm availability, then retry — the upstream API may be temporarily down or blocking automated access.`;
  }
  if (err instanceof InvalidIndicatorError) {
    return `Error: indicator "${err.code}" was not found in ${err.source}. Try: call list_available_indicators (optionally filtered by category) to discover valid codes.`;
  }
  if (err instanceof RateLimitError) {
    const wait = err.retryAfter !== undefined ? ` Wait ~${err.retryAfter}s.` : "";
    return `Error: ${err.source} rate-limited the request.${wait} Try: retry shortly; repeated calls are served from cache to reduce load.`;
  }
  if (err instanceof DataParseError) {
    return `Error: ${err.source} returned an unexpected response format${subject ? ` for${subject}` : ""}. Try: a different indicator or source, and report this if it persists.`;
  }
  if (err instanceof Error) {
    return `Error${subject ? ` fetching${subject}` : ""}: ${err.message}. Try: verify the inputs and retry.`;
  }
  return `An unknown error occurred${subject ? ` while fetching${subject}` : ""}. Try: retry, or call get_source_status.`;
}

/** Build an `isError` MCP tool result from any thrown value. */
export function toToolError(err: unknown, ctx: ToolErrorContext = {}): CallToolResult {
  return {
    content: [{ type: "text", text: toToolErrorMessage(err, ctx) }],
    isError: true,
  };
}
