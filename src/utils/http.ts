import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { SOURCE_META, type Source } from "../schemas/source.js";
import { RateLimitError, SourceUnavailableError } from "./errors.js";

const DEFAULT_HEADERS = {
  // Replace the contact with your own when deploying — some sources ask for one.
  "User-Agent": "laos-data-mcp/1.0 (civic-data-initiative; contact: contact@laos-data-mcp.example)",
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
    const res = await client.get<T>(url, { timeout: timeoutFor(source), ...config });
    return res.data;
  } catch (err) {
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
}
