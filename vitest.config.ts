import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Integration tests opt in with DATABASE_URL_TEST. Never silently reuse the
// development DATABASE_URL for a destructive test-database reset.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
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
