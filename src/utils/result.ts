import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** A plain-text MCP tool result. */
export function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

/** A human summary line followed by a pretty-printed JSON payload. */
export function jsonResult(summary: string, data: unknown): CallToolResult {
  return { content: [{ type: "text", text: `${summary}\n\n${JSON.stringify(data, null, 2)}` }] };
}
