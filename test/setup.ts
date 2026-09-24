import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// src/env.js validates these at import time. Production values are deliberately
// not needed by tests because auth and directory lookups are mocked at the API
// boundary.
process.env.SERVER_URL ??= "http://localhost:3000";
process.env.ADMIN_GROUP ??= "study-admins";
process.env.ALLOWED_ORIGINS_REGEX ??= "^http://localhost:3000$";
process.env.AUTH_ISSUER ??= "http://localhost:8080/realms/study";
process.env.AUTH_CLIENT_ID ??= "test-client";
process.env.AUTH_CLIENT_SECRET ??= "test-secret";
process.env.AUTH_JWKS_URI ??= "http://localhost:8080/realms/study/certs";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??=
  "postgresql://studystarter:studystarter@localhost:5433/studystarter_test?schema=public";

afterEach(() => {
  if (typeof document !== "undefined") cleanup();
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
