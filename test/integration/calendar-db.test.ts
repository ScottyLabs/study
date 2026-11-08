// @vitest-environment node

import { afterAll, expect, test, vi } from "vitest";
import { CALENDAR_SCOPES } from "~/server/calendar/security";
import {
  completeCalendarAuthorization,
  getCalendarStatus,
  startCalendarAuthorization,
} from "~/server/calendar/service";
import { db } from "~/server/db";
import { calendarEnv } from "../fakes/calendar";
import { googleAuth } from "../fakes/google-auth";
import { disconnectTestDatabase, integrationDatabaseConfigured } from "./database";

vi.mock("~/env", async () => ({ env: (await import("../fakes/calendar")).calendarEnv }));
vi.mock("google-auth-library", async () => (await import("../fakes/google-auth")).googleAuthModule);

const config = {
  SERVER_URL: "https://study-web-pr-54.scottylabs.net",
  OAUTH_RELAY_URL: "https://relay.scottylabs.net/oauth2/callback",
  CALENDAR_CLIENT_ID: "test-client",
  CALENDAR_CLIENT_SECRET: "test-secret",
  CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32),
};

const calendarDbTest = integrationDatabaseConfigured ? test : test.skip;

afterAll(disconnectTestDatabase);

function serveFrom(appOrigin = config.SERVER_URL) {
  Object.assign(calendarEnv, config, { SERVER_URL: appOrigin });
}

function fakeGoogle() {
  Object.assign(googleAuth, {
    redirectUri: config.OAUTH_RELAY_URL,
    tokens: {
      access_token: "database-test-access",
      refresh_token: "database-test-refresh",
      expiry_date: Date.now() + 3600_000,
    },
    scopes: CALENDAR_SCOPES,
    googleAccountId: "google-user",
    exchanges: 0,
  });
}

calendarDbTest(
  "PostgreSQL atomically consumes callbacks and persists isolated encrypted connections",
  async () => {
    vi.spyOn(console, "info").mockReturnValue();
    vi.spyOn(console, "warn").mockReturnValue();
    fakeGoogle();
    const userId = `calendar-test-${crypto.randomUUID()}`;
    try {
      await db.user.create({
        data: { id: userId, email: `${userId}@example.com`, name: "Calendar test user" },
      });
      serveFrom();
      const attempt = await startCalendarAuthorization(userId, "test-session");
      const state = new URL(attempt.authorizationUrl).searchParams.get("state") ?? "";
      const params = new URLSearchParams({ state, code: "test-code" });
      await expect(
        completeCalendarAuthorization(userId, "other-session", params),
      ).rejects.toThrow();
      const results = await Promise.allSettled([
        completeCalendarAuthorization(userId, "test-session", params),
        completeCalendarAuthorization(userId, "test-session", params),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(googleAuth.exchanges).toBe(1);
      const connection = await db.calendarConnection.findUniqueOrThrow({
        where: { userId_appOrigin: { userId, appOrigin: config.SERVER_URL } },
      });
      expect(connection.accessToken).not.toBe("database-test-access");
      expect(connection.refreshToken).not.toBe("database-test-refresh");
      expect((await getCalendarStatus(userId)).connected).toBe(true);
      serveFrom("https://study-web-pr-55.scottylabs.net");
      expect((await getCalendarStatus(userId)).connected).toBe(false);
      const completed = await db.calendarAuthAttempt.findUniqueOrThrow({
        where: { id: attempt.attemptId },
      });
      expect(completed.status).toBe("success");
      await db.user.delete({ where: { id: userId } });
      expect(await db.calendarConnection.count({ where: { userId } })).toBe(0);
      expect(await db.calendarAuthAttempt.count({ where: { userId } })).toBe(0);
    } finally {
      await db.user.deleteMany({ where: { id: userId } });
    }
  },
);
