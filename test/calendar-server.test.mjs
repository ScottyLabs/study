import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { typescriptLoader } from "./load-typescript.mjs";

const require = createRequire(import.meta.url);
const googleAuth = require("google-auth-library");
const quietConsole = { info() {}, warn() {} };
const config = {
  SERVER_URL: "https://study-web-pr-54.scottylabs.net",
  OAUTH_RELAY_URL: "https://relay.scottylabs.net/oauth2/callback",
  CALENDAR_CLIENT_ID: "calendar-client",
  CALENDAR_CLIENT_SECRET: "calendar-secret",
  CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32),
};
const userId = "student-1";
const sessionId = "session-1";

function fixture(settings = {}) {
  const attempts = new Map();
  let connection = settings.connection ?? null;
  const requests = [];
  let exchanges = 0;
  let refreshes = 0;
  let tokens = {
    access_token: "google-access",
    refresh_token: "google-refresh",
    expiry_date: Date.now() + 3600_000,
    scope: "",
  };
  const match = (row, where) =>
    Object.entries(where).every(([key, value]) => {
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if (value.gt) return row[key] > value.gt;
        if (value.lt) return row[key] < value.lt;
      }
      return (
        row[key] === value ||
        (row[key] instanceof Date && row[key].getTime() === value.getTime())
      );
    });
  const db = {
    calendarAuthAttempt: {
      async deleteMany({ where }) {
        for (const [id, attempt] of attempts)
          if (match(attempt, where)) attempts.delete(id);
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const attempt of attempts.values()) {
          if (match(attempt, where)) {
            Object.assign(attempt, data);
            count++;
          }
        }
        return { count };
      },
      async create({ data }) {
        const row = { id: crypto.randomUUID(), status: "pending", ...data };
        attempts.set(row.id, row);
        return row;
      },
      async findUnique({ where }) {
        return [...attempts.values()].find((row) => match(row, where)) ?? null;
      },
      async findFirst({ where }) {
        return [...attempts.values()].find((row) => match(row, where)) ?? null;
      },
      async update({ where, data }) {
        Object.assign(attempts.get(where.id), data);
      },
    },
    calendarConnection: {
      async findUnique({ where }) {
        return connection && match(connection, where.userId_appOrigin)
          ? { ...connection }
          : null;
      },
      async findUniqueOrThrow() {
        return { ...connection };
      },
      async upsert({ create, update }) {
        connection = {
          id: "connection-1",
          updatedAt: new Date(),
          ...(connection ? { ...connection, ...update } : create),
        };
        return connection;
      },
      async updateMany({ where, data }) {
        if (!connection || !match(connection, where)) return { count: 0 };
        connection = {
          ...connection,
          ...data,
          updatedAt: new Date(Date.now() + 1),
        };
        return { count: 1 };
      },
    },
    async $transaction(operations) {
      return Promise.all(operations);
    },
  };
  class OAuthClient extends googleAuth.OAuth2Client {
    async getToken(options) {
      exchanges++;
      assert.equal(options.redirect_uri, config.OAUTH_RELAY_URL);
      assert.ok(options.codeVerifier);
      if (settings.exchangeError) throw settings.exchangeError;
      return { tokens };
    }
    async getTokenInfo() {
      return {
        scopes: settings.scopes ?? security.CALENDAR_SCOPES,
        sub: settings.googleAccountId ?? "google-user-1",
      };
    }
    async refreshAccessToken() {
      refreshes++;
      if (settings.refreshError) throw settings.refreshError;
      this.credentials = {
        ...this.credentials,
        access_token: "refreshed-access",
        expiry_date: Date.now() + 3600_000,
      };
      return { credentials: this.credentials };
    }
  }
  class Calendar {
    constructor({ auth }) {
      this.events = Object.fromEntries(
        ["insert", "patch", "delete"].map((operation) => [
          operation,
          async (params, options) => {
            requests.push({
              operation,
              params,
              options,
              credentials: auth.credentials,
            });
            if (settings.eventError) throw settings.eventError;
            return {
              data: {
                id: "event-1",
                htmlLink: "https://calendar.google.com/event-1",
                privateField: "never-return",
              },
            };
          },
        ]),
      );
    }
  }
  const load = typescriptLoader(
    {
      "~/env": { env: { ...config, ...settings.env } },
      "~/server/db": { db },
      "google-auth-library": { ...googleAuth, OAuth2Client: OAuthClient },
      "googleapis/build/src/apis/calendar/v3": { calendar_v3: { Calendar } },
    },
    { console: quietConsole },
  );
  const security = load("src/server/calendar/security.ts");
  const service = load("src/server/calendar/service.ts");
  return {
    service,
    security,
    attempts,
    requests,
    load,
    get connection() {
      return connection;
    },
    get exchanges() {
      return exchanges;
    },
    get refreshes() {
      return refreshes;
    },
    set tokens(value) {
      tokens = value;
    },
    async authorize() {
      const start = await service.startCalendarAuthorization(userId, sessionId);
      const url = new URL(start.authorizationUrl);
      const params = new URLSearchParams({
        state: url.searchParams.get("state"),
        code: "authorization-code",
      });
      return { ...start, url, params, attempt: attempts.get(start.attemptId) };
    },
  };
}

test("credentials reject tampering, different users, origins, and keys", () => {
  const { security } = fixture();
  const context = "calendar:student-1:https://preview.example.com";
  const encrypted = security.encryptCredential(
    "secret-token",
    config.CALENDAR_TOKEN_ENCRYPTION_KEY,
    context,
  );
  assert.equal(
    security.decryptCredential(
      encrypted,
      config.CALENDAR_TOKEN_ENCRYPTION_KEY,
      context,
    ),
    "secret-token",
  );
  assert.ok(!encrypted.includes("secret-token"));
  assert.throws(() =>
    security.decryptCredential(encrypted, "cd".repeat(32), context),
  );
  assert.throws(() =>
    security.decryptCredential(
      encrypted,
      config.CALENDAR_TOKEN_ENCRYPTION_KEY,
      context + "other-user",
    ),
  );
  assert.throws(() =>
    security.decryptCredential(
      encrypted.slice(0, -2) + "xx",
      config.CALENDAR_TOKEN_ENCRYPTION_KEY,
      context,
    ),
  );
});

test("authorization uses the stable relay, PKCE, offline access, and exact preview callback", async () => {
  const f = fixture();
  const { url, params, attempt } = await f.authorize();
  assert.equal(url.searchParams.get("redirect_uri"), config.OAUTH_RELAY_URL);
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  const state = JSON.parse(
    Buffer.from(params.get("state"), "base64url").toString(),
  );
  assert.equal(
    state.return_to,
    `${config.SERVER_URL}/api/calendar/oauth/callback`,
  );
  assert.equal(attempt.stateHash, f.security.hashState(params.get("state")));
  assert.notEqual(attempt.codeVerifier, url.searchParams.get("code_challenge"));
  assert.equal(attempt.sessionId, sessionId);
});

test("successful callbacks persist encrypted tokens and expose no credentials", async () => {
  const f = fixture();
  const { params, attemptId } = await f.authorize();
  await f.service.completeCalendarAuthorization(userId, sessionId, params);
  assert.equal(f.exchanges, 1);
  assert.notEqual(f.connection.accessToken, "google-access");
  assert.notEqual(f.connection.refreshToken, "google-refresh");
  assert.deepEqual(await f.service.getCalendarStatus(userId), {
    configured: true,
    connected: true,
  });
  assert.deepEqual(
    await f.service.getCalendarAttemptStatus(userId, sessionId, attemptId),
    { status: "success" },
  );
  assert.equal(f.attempts.get(attemptId).codeVerifier, "");
});

test("a callback is exchanged at most once even when requests race", async () => {
  const f = fixture();
  const { params } = await f.authorize();
  const results = await Promise.allSettled([
    f.service.completeCalendarAuthorization(userId, sessionId, params),
    f.service.completeCalendarAuthorization(userId, sessionId, params),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(f.exchanges, 1);
  await assert.rejects(
    f.service.completeCalendarAuthorization(userId, sessionId, params),
    { code: "used_state" },
  );
});

test("wrong session/user, expiration, and modified return destinations never exchange codes", async () => {
  for (const kind of ["session", "user", "expired", "origin", "malformed"]) {
    const f = fixture();
    const { params, attempt } = await f.authorize();
    if (kind === "expired") attempt.expiresAt = new Date(0);
    if (kind === "origin") {
      const state = JSON.parse(
        Buffer.from(params.get("state"), "base64url").toString(),
      );
      state.return_to = "https://evil.example/callback";
      params.set(
        "state",
        Buffer.from(JSON.stringify(state)).toString("base64url"),
      );
    }
    if (kind === "malformed") params.set("state", "not-json");
    await assert.rejects(
      f.service.completeCalendarAuthorization(
        kind === "user" ? "other-user" : userId,
        kind === "session" ? "other-session" : sessionId,
        params,
      ),
      { code: "invalid_state" },
    );
    assert.equal(f.exchanges, 0);
  }
});

test("Google denial, missing code, missing refresh tokens, and partial consent settle attempts", async () => {
  for (const kind of ["denied", "code", "refresh", "scopes", "provider"]) {
    const f = fixture({
      ...(kind === "scopes" ? { scopes: [] } : {}),
      ...(kind === "provider"
        ? { exchangeError: new Error("contains-private-token") }
        : {}),
    });
    const { params, attempt } = await f.authorize();
    if (kind === "denied") params.set("error", "access_denied");
    if (kind === "code") params.delete("code");
    if (kind === "refresh")
      f.tokens = { access_token: "access", expiry_date: Date.now() + 3600_000 };
    await assert.rejects(
      f.service.completeCalendarAuthorization(userId, sessionId, params),
    );
    assert.equal(attempt.status, "failed");
    assert.equal(attempt.codeVerifier, "");
    assert.equal(f.connection, null);
  }
});

test("an omitted refresh token is preserved only for the same Google account", async () => {
  const f = fixture();
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  const encryptedRefresh = f.connection.refreshToken;
  f.tokens = { access_token: "new-access", expiry_date: Date.now() + 3600_000 };
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  const context = `calendar:${userId}:${config.SERVER_URL}`;
  assert.equal(
    f.security.decryptCredential(
      encryptedRefresh,
      config.CALENDAR_TOKEN_ENCRYPTION_KEY,
      context,
    ),
    f.security.decryptCredential(
      f.connection.refreshToken,
      config.CALENDAR_TOKEN_ENCRYPTION_KEY,
      context,
    ),
  );
  const otherAccount = fixture({
    connection: f.connection,
    googleAccountId: "different-google-user",
  });
  otherAccount.tokens = {
    access_token: "other-access",
    expiry_date: Date.now() + 3600_000,
  };
  await assert.rejects(
    otherAccount.service.completeCalendarAuthorization(
      userId,
      sessionId,
      (await otherAccount.authorize()).params,
    ),
    { code: "missing_refresh_token" },
  );
});

test("users and preview origins cannot use each other's connections or attempts", async () => {
  const f = fixture();
  const { attemptId, params } = await f.authorize();
  await assert.rejects(
    f.service.getCalendarAttemptStatus("other-user", sessionId, attemptId),
    { status: 404 },
  );
  await assert.rejects(
    f.service.getCalendarAttemptStatus(userId, "other-session", attemptId),
    { status: 404 },
  );
  await f.service.completeCalendarAuthorization(userId, sessionId, params);
  assert.equal(
    (await f.service.getCalendarStatus("other-user")).connected,
    false,
  );
  const otherPreview = fixture({
    connection: f.connection,
    env: { SERVER_URL: "https://study-web-pr-55.scottylabs.net" },
  });
  assert.equal(
    (await otherPreview.service.getCalendarStatus(userId)).connected,
    false,
  );
});

test("expired access tokens refresh on the server before Calendar requests", async () => {
  const f = fixture();
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  f.connection.accessTokenExpiresAt = new Date(0);
  const response = await f.service.calendarEventRequest(
    userId,
    "create",
    undefined,
    { summary: "Study Group" },
  );
  assert.equal(f.refreshes, 1);
  assert.deepEqual(response, {
    id: "event-1",
    htmlLink: "https://calendar.google.com/event-1",
  });
  assert.equal(f.requests[0].credentials.access_token, "refreshed-access");
  assert.equal(f.requests[0].credentials.refresh_token, undefined);
  assert.equal(f.requests[0].params.calendarId, "primary");
  assert.equal(f.requests[0].options.retry, false);
});

test("permanent refresh failure requires reconnection without retry loops", async () => {
  const f = fixture({
    refreshError: {
      response: { status: 400, data: { error: "invalid_grant" } },
    },
  });
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  f.connection.accessTokenExpiresAt = new Date(0);
  await assert.rejects(f.service.calendarEventRequest(userId, "create"), {
    code: "reconnect_required",
  });
  assert.equal(f.connection.requiresReconnection, true);
  await assert.rejects(f.service.calendarEventRequest(userId, "create"), {
    code: "reconnect_required",
  });
  assert.equal(f.refreshes, 1);
  assert.equal(f.requests.length, 0);
});

test("transient refresh errors preserve the connection; Calendar mutations are never replayed", async () => {
  const f = fixture({ refreshError: { response: { status: 503 } } });
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  f.connection.accessTokenExpiresAt = new Date(0);
  await assert.rejects(f.service.calendarEventRequest(userId, "create"), {
    status: 502,
  });
  assert.equal(f.connection.requiresReconnection, false);
  const failedEvent = fixture({
    connection: {
      ...f.connection,
      accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    },
    eventError: { response: { status: 503 } },
  });
  await assert.rejects(
    failedEvent.service.calendarEventRequest(userId, "create"),
    { status: 502 },
  );
  assert.equal(failedEvent.requests.length, 1);
});

test("expired credentials rejected after refresh also mark the current connection", async () => {
  const f = fixture({ eventError: { response: { status: 401 } } });
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  f.connection.accessTokenExpiresAt = new Date(0);
  await assert.rejects(
    f.service.calendarEventRequest(userId, "update", "event-1"),
    { code: "reconnect_required" },
  );
  assert.equal(f.connection.requiresReconnection, true);
});

test("event validation rejects foreign calendars, unknown fields, invalid dates, and URLs as IDs", () => {
  const { security } = fixture();
  const event = {
    summary: "Study Group",
    description: "Course: 15-112",
    location: "Library",
    start: { dateTime: "2026-10-03T14:00:00Z", timeZone: "America/New_York" },
    end: { dateTime: "2026-10-03T15:00:00Z", timeZone: "America/New_York" },
  };
  assert.equal(security.calendarEventSchema.safeParse(event).success, true);
  assert.equal(
    security.calendarEventSchema.safeParse({
      ...event,
      calendarId: "other-calendar",
    }).success,
    false,
  );
  assert.equal(
    security.calendarEventSchema.safeParse({ ...event, end: event.start })
      .success,
    false,
  );
  assert.equal(
    security.calendarEventIdSchema.safeParse("https://evil.example").success,
    false,
  );
});

test("unconfigured Calendar can report disabled without accessing credentials", async () => {
  const f = fixture({ env: { CALENDAR_CLIENT_ID: undefined } });
  assert.deepEqual(await f.service.getCalendarStatus(userId), {
    configured: false,
    connected: false,
  });
  await assert.rejects(
    f.service.startCalendarAuthorization(userId, sessionId),
    { code: "not_configured" },
  );
});

test("insufficient Calendar permission requires reconnection rather than repeated failures", async () => {
  const f = fixture({
    eventError: {
      response: {
        status: 403,
        data: {
          error: { errors: [{ reason: "insufficientPermissions" }] },
        },
      },
    },
  });
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  await assert.rejects(f.service.calendarEventRequest(userId, "create"), {
    code: "reconnect_required",
  });
  assert.equal(f.connection.requiresReconnection, true);
});

test("credentials encrypted with an old key require reconnection", async () => {
  const f = fixture();
  await f.service.completeCalendarAuthorization(
    userId,
    sessionId,
    (await f.authorize()).params,
  );
  const changedKey = fixture({
    connection: f.connection,
    env: { CALENDAR_TOKEN_ENCRYPTION_KEY: "cd".repeat(32) },
  });
  await assert.rejects(
    changedKey.service.calendarEventRequest(userId, "create"),
    { code: "reconnect_required" },
  );
  assert.equal(changedKey.connection.requiresReconnection, true);
});
