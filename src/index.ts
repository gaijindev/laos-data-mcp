import "dotenv/config";
import { createServer as createHttpServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { logger } from "./utils/logger.js";
import {
  isAuthorized,
  PayloadTooLargeError,
  readLimitedBody,
  resolveHttpSecurity,
} from "./utils/httpSecurity.js";

async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

function sendJson(res: import("node:http").ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function startHttp(port: number): Promise<void> {
  const security = resolveHttpSecurity(process.env, port);
  if (!security.authToken) {
    logger.warn(
      "HTTP transport has no MCP_HTTP_AUTH_TOKEN set — the /mcp endpoint is unauthenticated. " +
        `Binding to ${security.host}; set a token before exposing it beyond localhost.`,
    );
  }

  // Stateless: a fresh server + transport per request. Simple and correct for
  // a read-only data gateway; no session state to preserve between calls.
  const httpServer = createHttpServer((req, res) => {
    void (async () => {
      if (!req.url || new URL(req.url, "http://localhost").pathname !== "/mcp") {
        sendJson(res, 404, { error: "Not found. POST JSON-RPC to /mcp." });
        return;
      }

      if (!isAuthorized(security, req.headers.authorization)) {
        res.setHeader("WWW-Authenticate", "Bearer");
        sendJson(res, 401, { error: "Unauthorized." });
        return;
      }

      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableDnsRebindingProtection: security.dnsRebindingProtection,
        allowedHosts: security.allowedHosts,
        allowedOrigins: security.allowedOrigins,
      });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });

      try {
        let body: unknown;
        if (req.method === "POST") {
          const raw = await readLimitedBody(req, security.maxBodyBytes);
          if (raw) body = JSON.parse(raw);
        }
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          if (!res.headersSent) sendJson(res, 413, { error: err.message });
          req.destroy(); // stop any further upload now that we've responded
          return;
        }
        if (err instanceof SyntaxError) {
          if (!res.headersSent) sendJson(res, 400, { error: "Invalid JSON body." });
          return;
        }
        logger.error("HTTP request handling failed:", err);
        if (!res.headersSent) sendJson(res, 500, { error: "Internal server error" });
      }
    })();
  });

  httpServer.listen(port, security.host, () => {
    logger.info(`${SERVER_NAME} v${SERVER_VERSION} running on http://${security.host}:${port}/mcp`);
  });
}

async function main(): Promise<void> {
  const transport = process.env.MCP_TRANSPORT ?? "stdio";
  if (transport === "http") {
    const port = Number(process.env.MCP_HTTP_PORT ?? 3000);
    await startHttp(port);
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  logger.error("Fatal error starting server:", err);
  process.exit(1);
});
