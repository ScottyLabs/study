// @vitest-environment node

import { beforeEach, expect, test, vi } from "vitest";
import { decryptCredential, hashState } from "~/server/calendar/security";
import {
  completeCalendarAuthorization,
  getCalendarAttemptStatus,
  getCalendarStatus,
  startCalendarAuthorization,
} from "~/server/calendar/service";
import { calendarStore } from "../fakes/calendar";
import { googleAuth } from "../fakes/google-auth";
import {
  authorize,
  config,
  fixture,
  readState,
  sessionId,
  storedAttempt,
  storedConnection,
  userId,
} from "./calendar-fixture";

vi.mock("~/env", async () => ({ env: (await import("../fakes/calendar")).calendarEnv }));
vi.mock("~/server/db", async () => ({ db: (await import("../fakes/calendar")).calendarDb }));
vi.mock("google-auth-library", async () => (await import("../fakes/google-auth")).googleAuthModule);
vi.mock(
  "googleapis/build/src/apis/calendar/v3",
  async () => (await import("../fakes/calendar")).calendarModule,
);

beforeEach(() => {
  vi.spyOn(console, "info").mockReturnValue();
  vi.spyOn(console, "warn").mockReturnValue();
});

test("authorization uses the stable relay, PKCE, offline access, and exact preview callback", async () => {
  fixture();
  const { url, params, attempt } = await authorize();
  expect(url.searchParams.get("redirect_uri")).toBe(config.OAUTH_RELAY_URL);
  expect(url.searchParams.get("access_type")).toBe("offline");
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(readState(params.get("state")).return_to).toBe(
    `${config.SERVER_URL}/api/calendar/oauth/callback`,
  );
  expect(attempt.stateHash).toBe(hashState(params.get("state") ?? ""));
  expect(attempt.codeVerifier).not.toBe(url.searchParams.get("code_challenge"));
  expect(attempt.sessionId).toBe(sessionId);
});

test("successful callbacks persist encrypted tokens and expose no credentials", async () => {
  fixture();
  const { params, attemptId } = await authorize();
  await completeCalendarAuthorization(userId, sessionId, params);
  expect(googleAuth.exchanges).toBe(1);
  expect(storedConnection().accessToken).not.toBe("google-access");
  expect(storedConnection().refreshToken).not.toBe("google-refresh");
  expect(await getCalendarStatus(userId)).toEqual({ configured: true, connected: true });
  expect(await getCalendarAttemptStatus(userId, sessionId, attemptId)).toEqual({
    status: "success",
  });
  expect(storedAttempt(attemptId).codeVerifier).toBe("");
});

test("a callback is exchanged at most once even when requests race", async () => {
  fixture();
  const { params } = await authorize();
  const results = await Promise.allSettled([
    completeCalendarAuthorization(userId, sessionId, params),
    completeCalendarAuthorization(userId, sessionId, params),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(googleAuth.exchanges).toBe(1);
  await expect(completeCalendarAuthorization(userId, sessionId, params)).rejects.toMatchObject({
    code: "used_state",
  });
});

test.each(["session", "user", "expired", "origin", "malformed"])(
  "wrong session/user, expiration, and modified return destinations never exchange codes (%s)",
  async (kind) => {
    fixture();
    const { params, attempt } = await authorize();
    if (kind === "expired") attempt.expiresAt = new Date(0);
    if (kind === "origin") {
      const state = {
        ...readState(params.get("state")),
        return_to: "https://evil.example/callback",
      };
      params.set("state", Buffer.from(JSON.stringify(state)).toString("base64url"));
    }
    if (kind === "malformed") params.set("state", "not-json");
    await expect(
      completeCalendarAuthorization(
        kind === "user" ? "other-user" : userId,
        kind === "session" ? "other-session" : sessionId,
        params,
      ),
    ).rejects.toMatchObject({ code: "invalid_state" });
    expect(googleAuth.exchanges).toBe(0);
  },
);

test.each(["denied", "code", "refresh", "scopes", "provider"])(
  "Google denial, missing code, missing refresh tokens, and partial consent settle attempts (%s)",
  async (kind) => {
    fixture({
      ...(kind === "scopes" ? { scopes: [] } : {}),
      ...(kind === "provider" ? { exchangeError: new Error("contains-private-token") } : {}),
    });
    const { params, attempt } = await authorize();
    if (kind === "denied") params.set("error", "access_denied");
    if (kind === "code") params.delete("code");
    if (kind === "refresh") {
      googleAuth.tokens = { access_token: "access", expiry_date: Date.now() + 3600_000 };
    }
    await expect(completeCalendarAuthorization(userId, sessionId, params)).rejects.toThrow();
    expect(attempt.status).toBe("failed");
    expect(attempt.codeVerifier).toBe("");
    expect(calendarStore.connection).toBeNull();
  },
);

test("an omitted refresh token is preserved only for the same Google account", async () => {
  fixture();
  await completeCalendarAuthorization(userId, sessionId, (await authorize()).params);
  const encryptedRefresh = storedConnection().refreshToken;
  googleAuth.tokens = { access_token: "new-access", expiry_date: Date.now() + 3600_000 };
  await completeCalendarAuthorization(userId, sessionId, (await authorize()).params);
  const key = config.CALENDAR_TOKEN_ENCRYPTION_KEY;
  const context = `calendar:${userId}:${config.SERVER_URL}`;
  expect(decryptCredential(encryptedRefresh, key, context)).toBe(
    decryptCredential(storedConnection().refreshToken, key, context),
  );
  fixture({ connection: storedConnection(), googleAccountId: "different-google-user" });
  googleAuth.tokens = { access_token: "other-access", expiry_date: Date.now() + 3600_000 };
  await expect(
    completeCalendarAuthorization(userId, sessionId, (await authorize()).params),
  ).rejects.toMatchObject({ code: "missing_refresh_token" });
});

test("users and preview origins cannot use each other's connections or attempts", async () => {
  fixture();
  const { attemptId, params } = await authorize();
  await expect(getCalendarAttemptStatus("other-user", sessionId, attemptId)).rejects.toMatchObject({
    status: 404,
  });
  await expect(getCalendarAttemptStatus(userId, "other-session", attemptId)).rejects.toMatchObject({
    status: 404,
  });
  await completeCalendarAuthorization(userId, sessionId, params);
  expect((await getCalendarStatus("other-user")).connected).toBe(false);
  fixture({
    connection: storedConnection(),
    env: { SERVER_URL: "https://study-web-pr-55.scottylabs.net" },
  });
  expect((await getCalendarStatus(userId)).connected).toBe(false);
});

test("unconfigured Calendar can report disabled without accessing credentials", async () => {
  fixture({ env: { CALENDAR_CLIENT_ID: undefined } });
  expect(await getCalendarStatus(userId)).toEqual({ configured: false, connected: false });
  await expect(startCalendarAuthorization(userId, sessionId)).rejects.toMatchObject({
    code: "not_configured",
  });
});
