import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { SOURCE_META, type Source } from "../schemas/source.js";
import { breakerFor, circuitEnabled } from "./circuitBreaker.js";
import { RateLimitError, SourceError, SourceUnavailableError } from "./errors.js";

const DEFAULT_HEADERS = {
  // Some upstreams reject placeholder contact domains; use the public project URL.
  "User-Agent": "laos-data-mcp/1.0 (https://github.com/gaijindev/laos-data-mcp)",
  Accept: "application/json",
};

/** Shared axios instance with exponential-backoff retry. */
export const client: AxiosInstance = axios.create({
  headers: DEFAULT_HEADERS,
});

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429,
});

export function timeoutFor(source: Source): number {
  return SOURCE_META[source].timeoutMs;
}

function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : undefined;
}

/**
 * Whether a failure indicates the *source* is unhealthy (so it should count
 * toward opening the circuit) rather than a bad request on our side. Network
 * errors, timeouts, HTTP 429, and 5xx mean the source is struggling; a 4xx
 * client error means the source is up and answered, so it does not trip.
 */
function isUpstreamHealthFailure(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === undefined) return true; // no response: network error / timeout
    if (status === 429) return true; // rate-limited / overloaded
    return status >= 500; // upstream server error
  }
  return false; // non-transport error: don't penalize the source
}

/**
 * Run a request behind the source's circuit breaker. Fast-fails while the
 * circuit is open; otherwise records the outcome so repeated upstream failures
 * eventually trip it. Re-throws the raw error so the caller can map it.
 */
async function withCircuit<T>(source: Source, url: string, run: () => Promise<T>): Promise<T> {
  if (!circuitEnabled()) return run();
  const breaker = breakerFor(source);
  if (!breaker.tryAcquire()) {
    const { retryAt } = breaker.snapshot();
    throw new SourceUnavailableError(
      source,
      `circuit open after repeated failures — not retrying until ${retryAt} (${url})`,
    );
  }
  try {
    const result = await run();
    breaker.recordSuccess();
    return result;
  } catch (err) {
    if (isUpstreamHealthFailure(err)) breaker.recordFailure();
    else breaker.recordSuccess();
    throw err;
  }
}

/** Map any transport/HTTP failure to one of our typed errors. Always throws. */
function mapHttpError(source: Source, url: string, err: unknown): never {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 429) {
      throw new RateLimitError(source, parseRetryAfter(err.response?.headers["retry-after"]));
    }
    if (status !== undefined) {
      throw new SourceUnavailableError(source, `HTTP ${status} from ${url}`);
    }
    throw new SourceUnavailableError(source, `${err.code ?? "request failed"} (${url})`);
  }
  throw new SourceUnavailableError(source, err instanceof Error ? err.message : String(err));
}

/**
 * GET against a source with that source's timeout, returning the parsed body.
 * Maps transport failures and HTTP 4xx/5xx to our typed errors so adapters can
 * stay focused on shaping data. 2xx/3xx (including 200-with-HTML challenge
 * pages) resolve, so adapters can inspect the body when they need to.
 */
export async function httpGet<T = unknown>(
  source: Source,
  url: string,
  config: AxiosRequestConfig = {},
): Promise<T> {
  try {
    return await withCircuit(source, url, async () => {
      const res = await client.get<T>(url, { timeout: timeoutFor(source), ...config });
      return res.data;
    });
  } catch (err) {
    if (err instanceof SourceError) throw err; // already typed (e.g. open circuit)
    mapHttpError(source, url, err);
  }
}

/** POST against a source (same timeout + error mapping as httpGet). */
export async function httpPost<T = unknown>(
  source: Source,
  url: string,
  body?: unknown,
  config: AxiosRequestConfig = {},
): Promise<T> {
  try {
    return await withCircuit(source, url, async () => {
      const res = await client.post<T>(url, body, { timeout: timeoutFor(source), ...config });
      return res.data;
    });
  } catch (err) {
    if (err instanceof SourceError) throw err; // already typed (e.g. open circuit)
    mapHttpError(source, url, err);
  }
}
