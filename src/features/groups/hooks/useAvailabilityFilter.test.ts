import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ApiRequestError } from "~/lib/api/client";
import type { StudyGroup } from "~/types";
import { useAvailabilityFilter } from "./useAvailabilityFilter";

const calendar = vi.hoisted(() => ({
  configured: true,
  setupGoogleApi: vi.fn(),
  requestAccess: vi.fn(),
  fetchBusyIntervals: vi.fn(),
}));

vi.mock("~/helpers/calendar_helper", () => ({
  setupGoogleApi: calendar.setupGoogleApi,
  isCalendarApiReady: () => calendar.configured,
  requestCalendarAccessInteractive: calendar.requestAccess,
  fetchBusyIntervals: calendar.fetchBusyIntervals,
}));

const busy = [{ start: "2099-10-02T15:00:00Z", end: "2099-10-02T16:00:00Z" }];
const day = 24 * 3600_000;

function groupIn(ms: number) {
  return { startTime: new Date(Date.now() + ms) } as StudyGroup;
}

beforeEach(() => {
  calendar.configured = true;
  calendar.setupGoogleApi.mockResolvedValue(undefined);
  calendar.requestAccess.mockResolvedValue(undefined);
  calendar.fetchBusyIntervals.mockResolvedValue(busy);
});

test("the connection status loads with the feed, before any click", () => {
  renderHook(() => useAvailabilityFilter([groupIn(day)]));

  expect(calendar.setupGoogleApi).toHaveBeenCalledOnce();
  expect(calendar.requestAccess).not.toHaveBeenCalled();
});

test("a click asks for Calendar access before awaiting anything, so iPhone browsers allow the popup", async () => {
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  let done!: Promise<void>;
  act(() => {
    done = result.current.setEnabled(true);
  });
  expect(calendar.requestAccess).toHaveBeenCalledOnce();
  await act(() => done);
});

test("once access is granted, the filter loads busy times up to the latest group, capped at 60 days", async () => {
  const { result } = renderHook(() =>
    useAvailabilityFilter([groupIn(3 * day), groupIn(90 * day)]),
  );

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toEqual(busy);
  expect(result.current.status).toBeNull();
  const [from, to] = calendar.fetchBusyIntervals.mock.calls[0] as [Date, Date];
  expect(to.getTime() - from.getTime()).toBe(60 * day);
});

test("a cancelled or blocked popup keeps the filter off and shows the reason", async () => {
  calendar.requestAccess.mockRejectedValue(
    new Error("Calendar popup blocked. Allow popups and retry."),
  );
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toBeNull();
  expect(result.current.status).toBe(
    "Calendar popup blocked. Allow popups and retry.",
  );
  expect(calendar.fetchBusyIntervals).not.toHaveBeenCalled();
});

test("when Calendar is not configured on the server, the filter stays off and says so", async () => {
  calendar.configured = false;
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toBeNull();
  expect(result.current.status).toBe("Google Calendar is unavailable");
  expect(calendar.fetchBusyIntervals).not.toHaveBeenCalled();
});

test("revoked access keeps the filter off and asks to reconnect", async () => {
  calendar.fetchBusyIntervals.mockRejectedValue(
    new ApiRequestError("Reconnect Google Calendar to continue", 409),
  );
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toBeNull();
  expect(result.current.status).toBe("Reconnect Google Calendar");
});

test("a Google rate limit keeps the filter off and shows the server's reason", async () => {
  calendar.fetchBusyIntervals.mockRejectedValue(
    new ApiRequestError("Google Calendar is busy. Try again in a minute.", 429),
  );
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toBeNull();
  expect(result.current.status).toBe(
    "Google Calendar is busy. Try again in a minute.",
  );
});

test("turning the filter off clears busy times without asking for access", async () => {
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));
  await act(() => result.current.setEnabled(false));

  expect(result.current.busyIntervals).toBeNull();
  expect(calendar.requestAccess).toHaveBeenCalledOnce();
});
