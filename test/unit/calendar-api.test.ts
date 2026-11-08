// @vitest-environment node

import { beforeEach, expect, test, vi } from "vitest";
import type { ApiEnvironment } from "~/server/api/auth-middleware";
import { calendarApi } from "~/server/api/calendar";
import { GET } from "~/app/api/calendar/oauth/callback/route";

const mocks = vi.hoisted(() => ({
  eligible: true,
  calls: [] as unknown[][],
  completed: 0,
  session: null as null | {
    user: { id: string; andrewID: string };
    session: { id: string };
  },
}));

vi.mock("~/server/api/auth-middleware", async () => {
  const { createMiddleware } = await import("hono/factory");
  return {
    requireEligibleSession: createMiddleware<ApiEnvironment>((context, next) => {
      if (!mocks.eligible) return Promise.resolve(context.json({ error: "Unauthorized" }, 401));
      context.set("userId", "student-1");
      context.set("sessionId", "session-1");
      return next();
    }),
  };
});

vi.mock("~/server/calendar/service", () => ({
  calendarOrigin: () => "https://preview.example.com",
  getCalendarStatus: () => Promise.resolve({ configured: true, connected: true }),
  startCalendarAuthorization: (...args: unknown[]) => {
    mocks.calls.push(args);
    return Promise.resolve({
      attemptId: "attempt-1",
      authorizationUrl: "https://accounts.google.com/auth",
    });
  },
  getCalendarAttemptStatus: () => Promise.resolve({ status: "success" }),
  completeCalendarAuthorization: () => {
    mocks.completed++;
    return Promise.resolve();
  },
}));

vi.mock("~/server/calendar/events", () => ({
  calendarEventRequest: (...args: unknown[]) => {
    mocks.calls.push(args);
    return Promise.resolve({ id: "event-1" });
  },
}));

vi.mock("~/lib/auth", () => ({
  getSession: () => Promise.resolve(mocks.session),
}));

vi.mock("~/server/eligibility/service", () => ({
  getUserEligibility: () => Promise.resolve("ELIGIBLE"),
}));

beforeEach(() => {
  mocks.eligible = true;
  mocks.calls = [];
  mocks.completed = 0;
  mocks.session = null;
});

test("Calendar endpoints require the existing eligible session middleware", async () => {
  mocks.eligible = false;
  expect((await calendarApi.request("/status")).status).toBe(401);
  expect((await calendarApi.request("/authorize", { method: "POST" })).status).toBe(401);
  expect(mocks.calls).toHaveLength(0);
});

test("Calendar mutations reject foreign and absent Origin headers", async () => {
  const origins: Record<string, string>[] = [{}, { Origin: "https://evil.example" }];
  const rejected = await Promise.all(
    origins.map((headers) =>
      Promise.resolve(calendarApi.request("/authorize", { method: "POST", headers })),
    ),
  );
  expect(rejected.map((response) => response.status)).toEqual([403, 403]);
  const response = await calendarApi.request("/authorize", {
    method: "POST",
    headers: { Origin: "https://preview.example.com" },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(mocks.calls[0]).toEqual(["student-1", "session-1"]);
});

test("event routes validate input before invoking Google with the current user", async () => {
  const headers = {
    Origin: "https://preview.example.com",
    "Content-Type": "application/json",
  };
  const invalid = await calendarApi.request("/events", {
    method: "POST",
    headers,
    body: JSON.stringify({ calendarId: "someone-else" }),
  });
  expect(invalid.status).toBe(400);
  expect(mocks.calls).toHaveLength(0);
  const event = {
    summary: "Study Group",
    location: "Library",
    description: "Homework",
    start: { dateTime: "2026-10-03T14:00:00Z", timeZone: "America/New_York" },
    end: { dateTime: "2026-10-03T15:00:00Z", timeZone: "America/New_York" },
  };
  const response = await calendarApi.request("/events", {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });
  expect(response.status).toBe(201);
  expect(mocks.calls[0]).toEqual(["student-1", "create", undefined, event]);
  expect((await calendarApi.request("/events/event-1", { method: "DELETE", headers })).status).toBe(
    200,
  );
  expect(mocks.calls[1]).toEqual(["student-1", "delete", "event-1"]);
});

test("callback requires a session and removes codes from the result URL", async () => {
  vi.spyOn(console, "warn").mockReturnValue();
  const request = new Request(
    "https://preview.example.com/api/calendar/oauth/callback?code=private-code&state=state",
  );
  const denied = await GET(request);
  expect(denied.status).toBe(303);
  expect(mocks.completed).toBe(0);
  expect(denied.headers.get("Location")).toBe(
    "https://preview.example.com/api/calendar/oauth/result?status=failed",
  );
  mocks.session = {
    user: { id: "student-1", andrewID: "student" },
    session: { id: "session-1" },
  };
  const success = await GET(request);
  expect(mocks.completed).toBe(1);
  expect(success.headers.get("Location")).toBe(
    "https://preview.example.com/api/calendar/oauth/result?status=success",
  );
  expect(success.headers.get("Referrer-Policy")).toBe("no-referrer");
});
