import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Run tests serially to avoid DB conflicts in integration tests
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Setup file to configure environment variables for testing
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});
