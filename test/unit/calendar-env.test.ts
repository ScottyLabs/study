// @vitest-environment node

import { expect, test, vi } from "vitest";

const baseEnvironment = {
  SERVER_URL: "https://preview.example.com",
  ADMIN_GROUP: "study-admins",
  ALLOWED_ORIGINS_REGEX: "^https://preview\\.example\\.com$",
  AUTH_ISSUER: "https://keycloak.example.com/realms/study",
  AUTH_CLIENT_ID: "keycloak-client",
  AUTH_CLIENT_SECRET: "keycloak-secret",
  AUTH_JWKS_URI: "https://keycloak.example.com/realms/study/certs",
  OAUTH_RELAY_URL: "https://relay.example.com/oauth2/callback",
  DATABASE_URL: "postgresql://localhost/study",
  NEXT_PUBLIC_CALENDAR_CLIENT_ID: "existing-client.apps.googleusercontent.com",
  NEXT_PUBLIC_CALENDAR_API_KEY: "existing-api-key",
};

// Clear the rest of what env.js reads, since test/setup.ts or the dev shell may set it
const unsetEnvironment = [
  "APP_URL",
  "PORT",
  "KEYCLOAK_URL",
  "KEYCLOAK_REALM",
  "PROJECT_ADMIN_GROUP",
  "OIDC_CLIENT_ID",
  "OIDC_CLIENT_SECRET",
  "CALENDAR_CLIENT_ID",
  "CALENDAR_CLIENT_SECRET",
  "CALENDAR_TOKEN_ENCRYPTION_KEY",
  "PRISMA_QUERY_LOG",
  "SENTRY_DSN",
];

async function readEnvironment(values: Record<string, string> = {}) {
  // oxlint-disable-next-line unicorn/no-useless-undefined -- stubEnv unsets a variable given undefined
  for (const name of unsetEnvironment) vi.stubEnv(name, undefined);
  for (const [name, value] of Object.entries({ ...baseEnvironment, ...values })) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { env } = await import("~/env");
  return env;
}

test("server reuses the existing public Calendar client ID without requiring duplicate configuration", async () => {
  const env = await readEnvironment();
  expect(env.CALENDAR_CLIENT_ID).toBe(baseEnvironment.NEXT_PUBLIC_CALENDAR_CLIENT_ID);
  expect(env.CALENDAR_CLIENT_SECRET).toBeUndefined();
  expect(env.CALENDAR_TOKEN_ENCRYPTION_KEY).toBeUndefined();
});

test("existing Calendar client ID enables the flow when server secrets are provided", async () => {
  const env = await readEnvironment({
    CALENDAR_CLIENT_SECRET: "oauth-secret",
    CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32),
  });
  expect(env.CALENDAR_CLIENT_ID).toBe(baseEnvironment.NEXT_PUBLIC_CALENDAR_CLIENT_ID);
  expect(env.CALENDAR_CLIENT_SECRET).toBe("oauth-secret");
});

test("an explicit server client ID overrides the public ID", async () => {
  const env = await readEnvironment({ CALENDAR_CLIENT_ID: "override-client" });
  expect(env.CALENDAR_CLIENT_ID).toBe("override-client");
});

test("API keys cannot substitute for OAuth secrets and partial server configuration fails clearly", async () => {
  await expect(readEnvironment({ CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32) })).rejects.toThrow(
    /CALENDAR_CLIENT_SECRET/u,
  );
  await expect(readEnvironment({ CALENDAR_CLIENT_SECRET: "oauth-secret" })).rejects.toThrow(
    /CALENDAR_TOKEN_ENCRYPTION_KEY/u,
  );
  expect((await readEnvironment()).CALENDAR_CLIENT_SECRET).toBeUndefined();
});

test("provisioned OIDC credentials override legacy AUTH credentials as a pair", async () => {
  const env = await readEnvironment({
    OIDC_CLIENT_ID: "study-dev",
    OIDC_CLIENT_SECRET: "development-secret",
  });
  expect(env.AUTH_CLIENT_ID).toBe("study-dev");
  expect(env.AUTH_CLIENT_SECRET).toBe("development-secret");
});

test("legacy AUTH credentials work when no provisioned OIDC client is supplied", async () => {
  const env = await readEnvironment();
  expect(env.AUTH_CLIENT_ID).toBe(baseEnvironment.AUTH_CLIENT_ID);
  expect(env.AUTH_CLIENT_SECRET).toBe(baseEnvironment.AUTH_CLIENT_SECRET);
});

test("incomplete OIDC credentials never mix with the legacy client's credentials", async () => {
  await expect(readEnvironment({ OIDC_CLIENT_ID: "study-dev" })).rejects.toThrow(
    /AUTH_CLIENT_SECRET/u,
  );
  await expect(readEnvironment({ OIDC_CLIENT_SECRET: "development-secret" })).rejects.toThrow(
    /AUTH_CLIENT_ID/u,
  );
});
