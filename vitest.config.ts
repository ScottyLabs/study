import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Integration tests opt in with DATABASE_URL_TEST. Never reuse the
// development DATABASE_URL for a destructive test-database reset.
const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (process.env.DATABASE_TEST_REQUIRED === "true") {
  if (!testDatabaseUrl) {
    throw new Error(
      "DATABASE_URL_TEST is required for integration tests. Use the temporary database runner or configure a dedicated test database.",
    );
  }
  if (testDatabaseUrl === process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL_TEST must be different from DATABASE_URL to protect development data.",
    );
  }
}

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.join(projectRoot, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    fileParallelism: false,
  },
});
