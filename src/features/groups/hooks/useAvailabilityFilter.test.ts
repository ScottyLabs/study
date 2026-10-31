import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ApiRequestError } from "~/lib/api/client";
import type { StudyGroup } from "~/types";
import { useAvailabilityFilter } from "./useAvailabilityFilter";

const calendar = vi.hoisted(() => ({
  configured: true,
  connected: true,
  fetchBusyIntervals: vi.fn(),
}));

vi.mock("~/helpers/calendar_helper", () => ({
  setupGoogleApi: async () => undefined,
  isCalendarApiReady: () => calendar.configured,
  hasCalendarAccess: () => calendar.connected,
  fetchBusyIntervals: calendar.fetchBusyIntervals,
}));

const busy = [{ start: "2099-10-02T15:00:00Z", end: "2099-10-02T16:00:00Z" }];
const day = 24 * 3600_000;

function groupIn(ms: number) {
  return { startTime: new Date(Date.now() + ms) } as StudyGroup;
}

beforeEach(() => {
  calendar.configured = true;
  calendar.connected = true;
  calendar.fetchBusyIntervals.mockResolvedValue(busy);
});

test("turning the filter on loads busy times up to the latest group, capped at 60 days", async () => {
  const { result } = renderHook(() =>
    useAvailabilityFilter([groupIn(3 * day), groupIn(90 * day)]),
  );

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toEqual(busy);
  const [from, to] = calendar.fetchBusyIntervals.mock.calls[0] as [Date, Date];
  expect(to.getTime() - from.getTime()).toBe(60 * day);
});

test("re-rendering does not load busy times again", async () => {
  const { result, rerender } = renderHook(() =>
    useAvailabilityFilter([groupIn(day)]),
  );

  await act(() => result.current.setEnabled(true));
  rerender();
  rerender();

  expect(calendar.fetchBusyIntervals).toHaveBeenCalledOnce();
});

test("a disconnected calendar keeps the filter off and says so", async () => {
  calendar.connected = false;
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toBeNull();
  expect(result.current.status).toBe("Calendar not connected");
  expect(calendar.fetchBusyIntervals).not.toHaveBeenCalled();
});

test("a failed lookup keeps the filter off and shows the server's reason", async () => {
  calendar.fetchBusyIntervals.mockRejectedValue(
    new ApiRequestError(
      "Too many availability checks. Try again in a minute.",
      429,
    ),
  );
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));

  expect(result.current.busyIntervals).toBeNull();
  expect(result.current.status).toBe(
    "Too many availability checks. Try again in a minute.",
  );
});

test("turning the filter off clears busy times", async () => {
  const { result } = renderHook(() => useAvailabilityFilter([groupIn(day)]));

  await act(() => result.current.setEnabled(true));
  await act(() => result.current.setEnabled(false));

  expect(result.current.busyIntervals).toBeNull();
});
