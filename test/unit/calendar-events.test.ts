// @vitest-environment node

import { beforeEach, expect, test, vi } from "vitest";
import { calendarEventRequest } from "~/server/calendar/events";
import { completeCalendarAuthorization } from "~/server/calendar/service";
import { googleCalendar } from "../fakes/calendar";
import { googleAuth } from "../fakes/google-auth";
import {
  authorize,
  fixture,
  googleError,
  sessionId,
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

async function connect() {
  await completeCalendarAuthorization(userId, sessionId, (await authorize()).params);
}

test("expired access tokens refresh on the server before Calendar requests", async () => {
  fixture();
  await connect();
  storedConnection().accessTokenExpiresAt = new Date(0);
  const response = await calendarEventRequest(userId, "create", undefined, {
    summary: "Study Group",
  });
  expect(googleAuth.refreshes).toBe(1);
  expect(response).toEqual({ id: "event-1", htmlLink: "https://calendar.google.com/event-1" });
  const [request] = googleCalendar.requests;
  expect(request?.credentials.access_token).toBe("refreshed-access");
  expect(request?.credentials.refresh_token).toBeUndefined();
  expect(request?.params.calendarId).toBe("primary");
  expect(request?.options.retry).toBe(false);
});

test("permanent refresh failure requires reconnection without retry loops", async () => {
  fixture({ refreshError: googleError({ status: 400, data: { error: "invalid_grant" } }) });
  await connect();
  storedConnection().accessTokenExpiresAt = new Date(0);
  await expect(calendarEventRequest(userId, "create")).rejects.toMatchObject({
    code: "reconnect_required",
  });
  expect(storedConnection().requiresReconnection).toBe(true);
  await expect(calendarEventRequest(userId, "create")).rejects.toMatchObject({
    code: "reconnect_required",
  });
  expect(googleAuth.refreshes).toBe(1);
  expect(googleCalendar.requests).toHaveLength(0);
});

test("transient refresh errors preserve the connection; Calendar mutations are never replayed", async () => {
  fixture({ refreshError: googleError({ status: 503 }) });
  await connect();
  storedConnection().accessTokenExpiresAt = new Date(0);
  await expect(calendarEventRequest(userId, "create")).rejects.toMatchObject({ status: 502 });
  expect(storedConnection().requiresReconnection).toBe(false);
  fixture({
    connection: {
      ...storedConnection(),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    },
    eventError: googleError({ status: 503 }),
  });
  await expect(calendarEventRequest(userId, "create")).rejects.toMatchObject({ status: 502 });
  expect(googleCalendar.requests).toHaveLength(1);
});

test("expired credentials rejected after refresh also mark the current connection", async () => {
  fixture({ eventError: googleError({ status: 401 }) });
  await connect();
  storedConnection().accessTokenExpiresAt = new Date(0);
  await expect(calendarEventRequest(userId, "update", "event-1")).rejects.toMatchObject({
    code: "reconnect_required",
  });
  expect(storedConnection().requiresReconnection).toBe(true);
});

test("insufficient Calendar permission requires reconnection rather than repeated failures", async () => {
  fixture({
    eventError: googleError({
      status: 403,
      data: { error: { errors: [{ reason: "insufficientPermissions" }] } },
    }),
  });
  await connect();
  await expect(calendarEventRequest(userId, "create")).rejects.toMatchObject({
    code: "reconnect_required",
  });
  expect(storedConnection().requiresReconnection).toBe(true);
});

test("credentials encrypted with an old key require reconnection", async () => {
  fixture();
  await connect();
  fixture({
    connection: storedConnection(),
    env: { CALENDAR_TOKEN_ENCRYPTION_KEY: "cd".repeat(32) },
  });
  await expect(calendarEventRequest(userId, "create")).rejects.toMatchObject({
    code: "reconnect_required",
  });
  expect(storedConnection().requiresReconnection).toBe(true);
});
