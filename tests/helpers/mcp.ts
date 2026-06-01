import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../src/server.js";

export interface TestClient {
  client: Client;
  dispose: () => Promise<void>;
}

/** Spin up the real server wired to an in-memory client for integration tests. */
export async function createConnectedClient(): Promise<TestClient> {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "laos-data-mcp-test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    dispose: async () => {
      await client.close();
      await server.close();
    },
  };
}

/** Extract the first text block from a tool result. */
export function toolText(result: CallToolResult): string {
  const first = result.content[0];
  return first && first.type === "text" ? first.text : "";
}
