import assert from "node:assert/strict";
import test from "node:test";
import { typescriptLoader } from "./load-typescript.mjs";

class ApiRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function browserFixture(options = {}) {
  const calls = [];
  const removedKeys = [];
  let clock = 0;
  let opened = 0;
  let closed = 0;
  let finished = false;
  let attemptRequests = 0;
  let resolveAuthorization;
  const popup = {
    closed: false,
    opener: {},
    location: { href: "about:blank" },
    close() {
      closed++;
    },
  };
  const FakeDate = class extends Date {
    static now() {
      return clock;
    }
  };
  const apiRequest = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/status"))
      return {
        configured: options.configured ?? true,
        connected: options.connected ?? finished,
      };
    if (url.endsWith("/authorize")) {
      if (options.delayAuthorization)
        await new Promise((resolve) => {
          resolveAuthorization = resolve;
        });
      return {
        attemptId: "attempt-1",
        authorizationUrl: "https://accounts.google.com/authorization",
      };
    }
    if (url.includes("/attempts/")) {
      attemptRequests++;
      if (options.detached) {
        popup.closed = true;
        Object.defineProperty(popup, "location", {
          get() {
            throw new Error("Cross-origin window");
          },
          configurable: true,
        });
      }
      const status =
        options.status ?? (attemptRequests >= 2 ? "success" : "pending");
      if (status === "success") finished = true;
      return { status };
    }
    if (options.eventFailure)
      throw new ApiRequestError("Reconnect Calendar", 409);
    return { id: "event-1", deleted: true };
  };
  const load = typescriptLoader(
    { "~/lib/api/client": { apiRequest, ApiRequestError } },
    {
      window: {
        location: { origin: "https://preview.example.com" },
        open() {
          opened++;
          return options.blocked ? null : popup;
        },
      },
      sessionStorage: {
        removeItem(key) {
          removedKeys.push(key);
        },
      },
      console: { warn() {} },
      Date: FakeDate,
      setTimeout(callback, delay) {
        clock += delay;
        queueMicrotask(callback);
        return 0;
      },
    },
  );
  return {
    helper: load("src/helpers/calendar_helper.ts"),
    calls,
    popup,
    removedKeys,
    get opened() {
      return opened;
    },
    get closed() {
      return closed;
    },
    get clock() {
      return clock;
    },
    resolveAuthorization() {
      resolveAuthorization();
    },
  };
}

test("popup opens before any async work; concurrent connection clicks share one attempt", async () => {
  const f = browserFixture({ delayAuthorization: true });
  const first = f.helper.requestCalendarAccessInteractive();
  assert.equal(f.opened, 1);
  assert.equal(f.popup.opener, null);
  const second = f.helper.requestCalendarAccessInteractive();
  assert.equal(first, second);
  f.resolveAuthorization();
  await first;
  assert.equal(f.closed, 1);
  assert.equal(f.helper.hasCalendarAccess(), true);
  assert.equal(
    f.calls.filter((call) => call.url.endsWith("/authorize")).length,
    1,
  );
  assert.ok(f.removedKeys.includes("google_calendar_token_v1"));
});

test("connected users do not open another popup unless explicitly reconnecting", async () => {
  const f = browserFixture({ connected: true });
  await f.helper.setupGoogleApi();
  await f.helper.requestCalendarAccessInteractive();
  assert.equal(f.opened, 0);
  await f.helper.requestCalendarAccessInteractive({ forceRefresh: true });
  assert.equal(f.opened, 1);
});

test("a blocked popup rejects immediately and can be retried", async () => {
  const f = browserFixture({ blocked: true });
  await assert.rejects(
    f.helper.requestCalendarAccessInteractive(),
    /popup blocked/,
  );
  await assert.rejects(
    f.helper.requestCalendarAccessInteractive(),
    /popup blocked/,
  );
  assert.equal(f.opened, 2);
  assert.equal(f.calls.length, 0);
});

test("closing before Google navigation settles the request and clears deduplication", async () => {
  const f = browserFixture({ delayAuthorization: true });
  const promise = f.helper.requestCalendarAccessInteractive();
  f.popup.closed = true;
  f.resolveAuthorization();
  await assert.rejects(promise, /cancelled/);
  assert.equal(f.closed, 1);
  f.popup.closed = false;
  const retry = f.helper.requestCalendarAccessInteractive();
  f.resolveAuthorization();
  await retry;
  assert.equal(f.opened, 2);
});

test("Google opener isolation does not misclassify a live popup as cancelled", async () => {
  const f = browserFixture({ detached: true });
  await f.helper.requestCalendarAccessInteractive();
  assert.equal(f.helper.hasCalendarAccess(), true);
});

test("failed attempts and five-minute timeouts settle without navigating the form", async () => {
  const failed = browserFixture({ status: "failed" });
  await assert.rejects(
    failed.helper.requestCalendarAccessInteractive(),
    /did not complete/,
  );
  const timeout = browserFixture({ status: "pending" });
  await assert.rejects(
    timeout.helper.requestCalendarAccessInteractive(),
    /timed out/,
  );
  assert.equal(timeout.clock, 5 * 60_000);
  assert.equal(timeout.closed, 1);
});

test("Calendar operations use only same-origin endpoints and retain failure conventions", async () => {
  const f = browserFixture({ connected: true, eventFailure: true });
  await f.helper.setupGoogleApi();
  const date = {
    toDate: () => new Date("2026-10-03T14:00:00Z"),
    toMillis: () => 0,
  };
  assert.equal(
    await f.helper.addToCal(
      "Study",
      "15-112",
      "Homework",
      date,
      "Library",
      "Details",
      "student@cmu.edu",
    ),
    "None",
  );
  assert.equal(await f.helper.updateEvent("event-1", {}), null);
  assert.equal(await f.helper.deleteFromCal("event-1"), false);
  assert.equal(f.helper.hasCalendarAccess(), false);
  assert.ok(f.calls.every((call) => call.url.startsWith("/api/v1/calendar/")));
  assert.ok(f.calls.every((call) => !JSON.stringify(call).includes("Bearer")));
});

test("disabled Calendar leaves group actions free to continue without popups", async () => {
  const f = browserFixture({ configured: false });
  await f.helper.setupGoogleApi();
  await f.helper.requestCalendarAccessInteractive();
  assert.equal(f.opened, 0);
  assert.equal(await f.helper.updateEvent("event-1", {}), null);
});
