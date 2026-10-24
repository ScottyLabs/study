import assert from "node:assert/strict";
import test from "node:test";
import { typescriptLoader } from "./load-typescript.mjs";

const baseEnvironment = {
  SERVER_URL: "https://preview.example.com",
  BETTER_AUTH_URL: "https://preview.example.com",
  ADMIN_GROUP: "study-admins",
  ALLOWED_ORIGINS_REGEX: "^https://preview\\.example\\.com$",
  AUTH_ISSUER: "https://keycloak.example.com/realms/study",
  AUTH_CLIENT_ID: "keycloak-client",
  AUTH_CLIENT_SECRET: "keycloak-secret",
  AUTH_JWKS_URI: "https://keycloak.example.com/realms/study/certs",
  OAUTH_RELAY_URL: "https://relay.example.com/oauth2/callback",
  BETTER_AUTH_SECRET: "test-secret",
  DATABASE_URL: "postgresql://localhost/study",
  NEXT_PUBLIC_CALENDAR_CLIENT_ID: "existing-client.apps.googleusercontent.com",
  NEXT_PUBLIC_CALENDAR_API_KEY: "existing-api-key",
};

function readEnvironment(values = {}) {
  const load = typescriptLoader({}, { process: { env: { ...baseEnvironment, ...values } } });
  return load("src/env.js").env;
}

test("server reuses the existing public Calendar client ID without requiring duplicate configuration", () => {
  const env = readEnvironment();
  assert.equal(env.CALENDAR_CLIENT_ID, baseEnvironment.NEXT_PUBLIC_CALENDAR_CLIENT_ID);
  assert.equal(env.CALENDAR_CLIENT_SECRET, undefined);
  assert.equal(env.CALENDAR_TOKEN_ENCRYPTION_KEY, undefined);
});

test("existing Calendar client ID enables the flow when server secrets are provided", () => {
  const env = readEnvironment({
    CALENDAR_CLIENT_SECRET: "oauth-secret",
    CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32),
  });
  assert.equal(env.CALENDAR_CLIENT_ID, baseEnvironment.NEXT_PUBLIC_CALENDAR_CLIENT_ID);
  assert.equal(env.CALENDAR_CLIENT_SECRET, "oauth-secret");
});

test("an explicit server client ID overrides the public ID", () => {
  assert.equal(readEnvironment({ CALENDAR_CLIENT_ID: "override-client" }).CALENDAR_CLIENT_ID, "override-client");
});

test("API keys cannot substitute for OAuth secrets and partial server configuration fails clearly", () => {
  assert.throws(() => readEnvironment({ CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32) }), /CALENDAR_CLIENT_SECRET/);
  assert.throws(() => readEnvironment({ CALENDAR_CLIENT_SECRET: "oauth-secret" }), /CALENDAR_TOKEN_ENCRYPTION_KEY/);
  assert.equal(readEnvironment().CALENDAR_CLIENT_SECRET, undefined);
});

test("provisioned OIDC credentials override legacy AUTH credentials as a pair", () => {
  const env = readEnvironment({ OIDC_CLIENT_ID: "study-dev", OIDC_CLIENT_SECRET: "development-secret" });
  assert.equal(env.AUTH_CLIENT_ID, "study-dev");
  assert.equal(env.AUTH_CLIENT_SECRET, "development-secret");
});

test("legacy AUTH credentials work when no provisioned OIDC client is supplied", () => {
  const env = readEnvironment();
  assert.equal(env.AUTH_CLIENT_ID, baseEnvironment.AUTH_CLIENT_ID);
  assert.equal(env.AUTH_CLIENT_SECRET, baseEnvironment.AUTH_CLIENT_SECRET);
});

test("incomplete OIDC credentials never mix with the legacy client's credentials", () => {
  assert.throws(() => readEnvironment({ OIDC_CLIENT_ID: "study-dev" }), /AUTH_CLIENT_SECRET/);
  assert.throws(() => readEnvironment({ OIDC_CLIENT_SECRET: "development-secret" }), /AUTH_CLIENT_ID/);
});
