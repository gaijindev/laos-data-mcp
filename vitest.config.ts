import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.ts"],
      // Only the process entrypoint (transport wiring) is excluded; everything
      // else — including server.ts, resources, and prompts — is covered by the
      // in-memory MCP integration tests.
      exclude: ["src/index.ts", "src/**/*.d.ts"],
      // Spec mandate is 80% lines (currently ~89%). Branch coverage is lower
      // because of defensive null-handling, so its floor is set just under the
      // current value as a regression ratchet.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
  },
});
