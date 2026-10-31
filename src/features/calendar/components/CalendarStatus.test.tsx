import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { CalendarStatus } from "./CalendarStatus";

const calendar = vi.hoisted(() => ({
  configured: true,
  connected: false,
  setupGoogleApi: vi.fn(),
  requestCalendarAccessInteractive: vi.fn(),
}));

vi.mock("~/helpers/calendar_helper", () => ({
  isCalendarApiReady: () => calendar.configured,
  hasCalendarAccess: () => calendar.connected,
  setupGoogleApi: calendar.setupGoogleApi,
  requestCalendarAccessInteractive: calendar.requestCalendarAccessInteractive,
}));

beforeEach(() => {
  calendar.configured = true;
  calendar.connected = false;
  calendar.setupGoogleApi.mockResolvedValue(undefined);
  calendar.requestCalendarAccessInteractive.mockReset();
});

test("shows a connected status with no connect action", async () => {
  calendar.connected = true;
  render(<CalendarStatus />);

  expect(await screen.findByText(/Connected/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
});

test("connecting from the status updates it to connected", async () => {
  calendar.requestCalendarAccessInteractive.mockImplementation(async () => {
    calendar.connected = true;
  });
  render(<CalendarStatus />);

  await userEvent.click(await screen.findByRole("button", { name: "Connect" }));

  expect(await screen.findByText(/Connected/)).toBeVisible();
});

test("a failed connection keeps the connect action and says why", async () => {
  calendar.requestCalendarAccessInteractive.mockRejectedValue(
    new Error("Calendar popup blocked. Allow popups and retry."),
  );
  render(<CalendarStatus />);

  await userEvent.click(await screen.findByRole("button", { name: "Connect" }));

  expect(await screen.findByText(/Calendar popup blocked/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
});

test("renders nothing when Calendar is not configured", async () => {
  calendar.configured = false;
  const { container } = render(<CalendarStatus />);

  await vi.waitFor(() => expect(calendar.setupGoogleApi).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
