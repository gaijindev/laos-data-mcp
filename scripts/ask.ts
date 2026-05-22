// Dev helper: drive the real MCP server via the in-memory client so you can
// call tools without wiring the server into a Claude session. Throwaway.
//   pnpm ask list
//   pnpm ask call <toolName> '<jsonArgs>'
import { createConnectedClient, toolText } from "../tests/helpers/mcp.js";

async function main(): Promise<void> {
  const [cmd, toolName, argsJson] = process.argv.slice(2);
  const { client, dispose } = await createConnectedClient();
  try {
    if (cmd === "list") {
      const { tools } = await client.listTools();
      for (const t of tools) {
        console.log(`\n## ${t.name}`);
        if (t.description) console.log(t.description);
        console.log(JSON.stringify(t.inputSchema, null, 2));
      }
      const { resources } = await client.listResources();
      console.log("\n# RESOURCES");
      for (const r of resources) console.log(`${r.uri} — ${r.name}`);
      const { prompts } = await client.listPrompts();
      console.log("\n# PROMPTS");
      for (const p of prompts) console.log(`${p.name} — ${p.description ?? ""}`);
      return;
    }
    if (cmd === "call" && toolName) {
      const args = argsJson ? JSON.parse(argsJson) : {};
      const result = await client.callTool({ name: toolName, arguments: args });
      console.log(toolText(result as Parameters<typeof toolText>[0]));
      return;
    }
    console.error("usage: tsx scripts/ask.ts list | call <tool> '<jsonArgs>'");
    process.exitCode = 1;
  } finally {
    await dispose();
  }
}

void main();
