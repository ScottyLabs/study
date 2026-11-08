// @vitest-environment node

import { afterEach, expect, test, vi } from "vitest";
import type * as ApiClient from "~/lib/api/client";

type ApiHandler = (url: string, init: RequestInit | undefined) => Promise<unknown>;

const api = vi.hoisted(() => ({
  handle: (() => Promise.reject(new Error("no fixture"))) as ApiHandler,
}));

vi.mock("~/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  apiRequest: (url: string, init?: RequestInit) => api.handle(url, init),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

type Options = {
  configured?: boolean;
  connected?: boolean;
  blocked?: boolean;
  delayAuthorization?: boolean;
  detached?: boolean;
  status?: string;
  eventFailure?: boolean;
};

type Browser = ReturnType<typeof browserState>;

function browserState() {
  const state = {
    calls: [] as { url: string; init: RequestInit | undefined }[],
    removedKeys: [] as string[],
    clock: 0,
    opened: 0,
    closed: 0,
    finished: false,
    attemptRequests: 0,
    resolveAuthorization: undefined as (() => void) | undefined,
    popup: {
      closed: false,
      opener: {} as unknown,
      location: { href: "about:blank" },
      close() {
        state.closed++;
      },
    },
  };
  return state;
}

function detachPopup(browser: Browser) {
  browser.popup.closed = true;
  Object.defineProperty(browser.popup, "location", {
    get() {
      throw new Error("Cross-origin window");
    },
    configurable: true,
  });
}

function calendarApi(options: Options, browser: Browser, failure: Error): ApiHandler {
  return async (url, init) => {
    browser.calls.push({ url, init });
    if (url.endsWith("/status")) {
      return {
        configured: options.configured ?? true,
        connected: options.connected ?? browser.finished,
      };
    }
    if (url.endsWith("/authorize")) {
      if (options.delayAuthorization === true) {
        await new Promise<void>((resolve) => {
          browser.resolveAuthorization = resolve;
        });
      }
      return {
        attemptId: "attempt-1",
        authorizationUrl: "https://accounts.google.com/authorization",
      };
    }
    if (url.includes("/attempts/")) {
      browser.attemptRequests++;
      if (options.detached === true) detachPopup(browser);
      const status = options.status ?? (browser.attemptRequests >= 2 ? "success" : "pending");
      if (status === "success") browser.finished = true;
      return { status };
    }
    if (options.eventFailure === true) throw failure;
    return { id: "event-1", deleted: true };
  };
}

function stubBrowser(options: Options, browser: Browser) {
  vi.stubGlobal("window", {
    location: { origin: "https://preview.example.com" },
    open() {
      browser.opened++;
      return options.blocked === true ? null : browser.popup;
    },
  });
  vi.stubGlobal("sessionStorage", {
    removeItem(key: string) {
      browser.removedKeys.push(key);
    },
  });
  vi.stubGlobal("setTimeout", (callback: () => void, delay: number) => {
    browser.clock += delay;
    queueMicrotask(callback);
    return 0;
  });
  vi.spyOn(Date, "now").mockImplementation(() => browser.clock);
  vi.spyOn(console, "warn").mockReturnValue();
}

// Each fixture gets a fresh helper, since it keeps connection state at module level
async function browserFixture(options: Options = {}) {
  vi.resetModules();
  const { ApiRequestError } = await import("~/lib/api/client");
  const browser = browserState();
  api.handle = calendarApi(options, browser, new ApiRequestError("Reconnect Calendar", 409));
  stubBrowser(options, browser);
  return { helper: await import("~/helpers/calendar_helper"), browser };
}

test("popup opens before any async work; concurrent connection clicks share one attempt", async () => {
  const { helper, browser } = await browserFixture({ delayAuthorization: true });
  const first = helper.requestCalendarAccessInteractive();
  expect(browser.opened).toBe(1);
  expect(browser.popup.opener).toBeNull();
  const second = helper.requestCalendarAccessInteractive();
  expect(second).toBe(first);
  browser.resolveAuthorization?.();
  await first;
  expect(browser.closed).toBe(1);
  expect(helper.hasCalendarAccess()).toBe(true);
  expect(browser.calls.filter((call) => call.url.endsWith("/authorize"))).toHaveLength(1);
  expect(browser.removedKeys).toContain("google_calendar_token_v1");
});

test("connected users do not open another popup unless explicitly reconnecting", async () => {
  const { helper, browser } = await browserFixture({ connected: true });
  await helper.setupGoogleApi();
  await helper.requestCalendarAccessInteractive();
  expect(browser.opened).toBe(0);
  await helper.requestCalendarAccessInteractive({ forceRefresh: true });
  expect(browser.opened).toBe(1);
});

test("a blocked popup rejects immediately and can be retried", async () => {
  const { helper, browser } = await browserFixture({ blocked: true });
  await expect(helper.requestCalendarAccessInteractive()).rejects.toThrow(/popup blocked/u);
  await expect(helper.requestCalendarAccessInteractive()).rejects.toThrow(/popup blocked/u);
  expect(browser.opened).toBe(2);
  expect(browser.calls).toHaveLength(0);
});

test("closing before Google navigation settles the request and clears deduplication", async () => {
  const { helper, browser } = await browserFixture({ delayAuthorization: true });
  const promise = helper.requestCalendarAccessInteractive();
  browser.popup.closed = true;
  browser.resolveAuthorization?.();
  await expect(promise).rejects.toThrow(/cancelled/u);
  expect(browser.closed).toBe(1);
  browser.popup.closed = false;
  const retry = helper.requestCalendarAccessInteractive();
  browser.resolveAuthorization?.();
  await retry;
  expect(browser.opened).toBe(2);
});

test("Google opener isolation does not misclassify a live popup as cancelled", async () => {
  const { helper } = await browserFixture({ detached: true });
  await helper.requestCalendarAccessInteractive();
  expect(helper.hasCalendarAccess()).toBe(true);
});

test("failed attempts and five-minute timeouts settle without navigating the form", async () => {
  const failed = await browserFixture({ status: "failed" });
  await expect(failed.helper.requestCalendarAccessInteractive()).rejects.toThrow(
    /did not complete/u,
  );
  const timeout = await browserFixture({ status: "pending" });
  await expect(timeout.helper.requestCalendarAccessInteractive()).rejects.toThrow(/timed out/u);
  expect(timeout.browser.clock).toBe(5 * 60_000);
  expect(timeout.browser.closed).toBe(1);
});

test("Calendar operations use only same-origin endpoints and retain failure conventions", async () => {
  const { helper, browser } = await browserFixture({ connected: true, eventFailure: true });
  await helper.setupGoogleApi();
  const date = { toDate: () => new Date("2026-10-03T14:00:00Z"), toMillis: () => 0 };
  expect(
    await helper.addToCal(
      "Study",
      "15-112",
      "Homework",
      date,
      "Library",
      "Details",
      "student@cmu.edu",
    ),
  ).toBe("None");
  expect(await helper.updateEvent("event-1", {})).toBeNull();
  expect(await helper.deleteFromCal("event-1")).toBe(false);
  expect(helper.hasCalendarAccess()).toBe(false);
  expect(browser.calls.every((call) => call.url.startsWith("/api/v1/calendar/"))).toBe(true);
  expect(browser.calls.every((call) => !JSON.stringify(call).includes("Bearer"))).toBe(true);
});

test("disabled Calendar leaves group actions free to continue without popups", async () => {
  const { helper, browser } = await browserFixture({ configured: false });
  await helper.setupGoogleApi();
  await helper.requestCalendarAccessInteractive();
  expect(browser.opened).toBe(0);
  expect(await helper.updateEvent("event-1", {})).toBeNull();
});
