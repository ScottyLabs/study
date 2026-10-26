import assert from "node:assert/strict";
import test from "node:test";
import { typescriptLoader } from "./load-typescript.mjs";

function apiFixture() {
  let eligible = true;
  const calls = [];
  const load = typescriptLoader({
    "./auth-middleware": {
      async requireEligibleSession(context, next) {
        if (!eligible) return context.json({ error: "Unauthorized" }, 401);
        context.set("userId", "student-1");
        context.set("sessionId", "session-1");
        await next();
      },
    },
    "~/server/calendar/service": {
      calendarOrigin: () => "https://preview.example.com",
      getCalendarStatus: async () => ({ configured: true, connected: true }),
      startCalendarAuthorization: async (...args) => {
        calls.push(args);
        return {
          attemptId: "attempt-1",
          authorizationUrl: "https://accounts.google.com/auth",
        };
      },
      getCalendarAttemptStatus: async () => ({ status: "success" }),
      calendarEventRequest: async (...args) => {
        calls.push(args);
        return { id: "event-1" };
      },
    },
  });
  return {
    api: load("src/server/api/calendar.ts").calendarApi,
    calls,
    denySession() {
      eligible = false;
    },
  };
}

test("Calendar endpoints require the existing eligible session middleware", async () => {
  const f = apiFixture();
  f.denySession();
  assert.equal((await f.api.request("/status")).status, 401);
  assert.equal(
    (await f.api.request("/authorize", { method: "POST" })).status,
    401,
  );
  assert.equal(f.calls.length, 0);
});

test("Calendar mutations reject foreign and absent Origin headers", async () => {
  const f = apiFixture();
  for (const origin of [undefined, "https://evil.example"]) {
    const response = await f.api.request("/authorize", {
      method: "POST",
      headers: origin ? { Origin: origin } : {},
    });
    assert.equal(response.status, 403);
  }
  const response = await f.api.request("/authorize", {
    method: "POST",
    headers: { Origin: "https://preview.example.com" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(f.calls[0], ["student-1", "session-1"]);
});

test("event routes validate input before invoking Google with the current user", async () => {
  const f = apiFixture();
  const headers = {
    Origin: "https://preview.example.com",
    "Content-Type": "application/json",
  };
  const invalid = await f.api.request("/events", {
    method: "POST",
    headers,
    body: JSON.stringify({ calendarId: "someone-else" }),
  });
  assert.equal(invalid.status, 400);
  assert.equal(f.calls.length, 0);
  const event = {
    summary: "Study Group",
    location: "Library",
    description: "Homework",
    start: { dateTime: "2026-10-03T14:00:00Z", timeZone: "America/New_York" },
    end: { dateTime: "2026-10-03T15:00:00Z", timeZone: "America/New_York" },
  };
  const response = await f.api.request("/events", {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(f.calls[0], ["student-1", "create", undefined, event]);
  assert.equal(
    (await f.api.request("/events/event-1", { method: "DELETE", headers }))
      .status,
    200,
  );
  assert.deepEqual(f.calls[1], ["student-1", "delete", "event-1"]);
});

test("callback requires a session and removes codes from the result URL", async () => {
  let session = null;
  let completed = 0;
  const load = typescriptLoader(
    {
      "~/lib/auth": { auth: { api: { getSession: async () => session } } },
      "~/server/calendar/service": {
        calendarOrigin: () => "https://preview.example.com",
        completeCalendarAuthorization: async () => {
          completed++;
        },
      },
      "~/server/eligibility/service": {
        getUserEligibility: async () => "ELIGIBLE",
      },
    },
    { console: { warn() {} } },
  );
  const { GET } = load("src/app/api/calendar/oauth/callback/route.ts");
  const request = new Request(
    "https://preview.example.com/api/calendar/oauth/callback?code=private-code&state=state",
  );
  const denied = await GET(request);
  assert.equal(denied.status, 303);
  assert.equal(completed, 0);
  assert.equal(
    denied.headers.get("Location"),
    "https://preview.example.com/api/calendar/oauth/result?status=failed",
  );
  session = {
    user: { id: "student-1", andrewID: "student" },
    session: { id: "session-1" },
  };
  const success = await GET(request);
  assert.equal(completed, 1);
  assert.equal(
    success.headers.get("Location"),
    "https://preview.example.com/api/calendar/oauth/result?status=success",
  );
  assert.equal(success.headers.get("Referrer-Policy"), "no-referrer");
});
