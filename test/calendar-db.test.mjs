import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { typescriptLoader } from "./load-typescript.mjs";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const googleAuth = require("google-auth-library");
const databaseURL = process.env.CALENDAR_TEST_DATABASE_URL;

test(
  "PostgreSQL atomically consumes callbacks and persists isolated encrypted connections",
  {
    skip: !databaseURL,
  },
  async () => {
    const db = new PrismaClient({ datasources: { db: { url: databaseURL } } });
    const userId = `calendar-test-${crypto.randomUUID()}`;
    const config = {
      SERVER_URL: "https://study-web-pr-54.scottylabs.net",
      OAUTH_RELAY_URL: "https://relay.scottylabs.net/oauth2/callback",
      CALENDAR_CLIENT_ID: "test-client",
      CALENDAR_CLIENT_SECRET: "test-secret",
      CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32),
    };
    let exchanges = 0;
    const makeService = (appOrigin = config.SERVER_URL) => {
      class OAuthClient extends googleAuth.OAuth2Client {
        async getToken() {
          exchanges++;
          return {
            tokens: {
              access_token: "database-test-access",
              refresh_token: "database-test-refresh",
              expiry_date: Date.now() + 3600_000,
            },
          };
        }
        async getTokenInfo() {
          return {
            sub: "google-user",
            scopes: [
              "https://www.googleapis.com/auth/calendar.events.owned",
              "https://www.googleapis.com/auth/calendar.freebusy",
            ],
          };
        }
      }
      const load = typescriptLoader(
        {
          "~/env": { env: { ...config, SERVER_URL: appOrigin } },
          "~/server/db": { db },
          "google-auth-library": { ...googleAuth, OAuth2Client: OAuthClient },
        },
        { console: { info() {}, warn() {} } },
      );
      return load("src/server/calendar/service.ts");
    };
    try {
      await db.user.create({
        data: {
          id: userId,
          email: `${userId}@example.com`,
          name: "Calendar test user",
        },
      });
      const service = makeService();
      const attempt = await service.startCalendarAuthorization(
        userId,
        "test-session",
      );
      const state = new URL(attempt.authorizationUrl).searchParams.get("state");
      const params = new URLSearchParams({ state, code: "test-code" });
      await assert.rejects(
        service.completeCalendarAuthorization(userId, "other-session", params),
      );
      const results = await Promise.allSettled([
        service.completeCalendarAuthorization(userId, "test-session", params),
        service.completeCalendarAuthorization(userId, "test-session", params),
      ]);
      assert.equal(
        results.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(exchanges, 1);
      const connection = await db.calendarConnection.findUniqueOrThrow({
        where: { userId_appOrigin: { userId, appOrigin: config.SERVER_URL } },
      });
      assert.notEqual(connection.accessToken, "database-test-access");
      assert.notEqual(connection.refreshToken, "database-test-refresh");
      assert.equal(
        (await makeService().getCalendarStatus(userId)).connected,
        true,
      );
      assert.equal(
        (
          await makeService(
            "https://study-web-pr-55.scottylabs.net",
          ).getCalendarStatus(userId)
        ).connected,
        false,
      );
      assert.equal(
        (
          await db.calendarAuthAttempt.findUniqueOrThrow({
            where: { id: attempt.attemptId },
          })
        ).status,
        "success",
      );
      await db.user.delete({ where: { id: userId } });
      assert.equal(await db.calendarConnection.count({ where: { userId } }), 0);
      assert.equal(
        await db.calendarAuthAttempt.count({ where: { userId } }),
        0,
      );
    } finally {
      await db.user.deleteMany({ where: { id: userId } });
      await db.$disconnect();
    }
  },
);
