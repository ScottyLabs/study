import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { SharedGroupPage } from "./SharedGroupPage";
import { ApiRequestError } from "~/lib/api/client";
import type { StudyGroup } from "~/types";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  blocking: vi.fn(),
  push: vi.fn(),
  join: vi.fn(),
  calendar: vi.fn(),
  addCalendar: vi.fn(),
  capture: vi.fn(),
}));
const user = {
  fullName: "Student",
  emailAddresses: [{ emailAddress: "student@cmu.edu" }],
};
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("~/lib/auth-client", () => ({ useUser: () => ({ user }) }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({ capture: mocks.capture }),
}));
vi.mock("~/helpers/calendar_helper", () => ({
  setupGoogleApi: async () => undefined,
  requestCalendarAccessInteractive: mocks.calendar,
  addToCal: mocks.addCalendar,
  deleteFromCal: vi.fn(),
}));
vi.mock("./EditGroupModal", () => ({ default: () => null }));
vi.mock("~/features/profile/components/CreateProfilePopUp", () => ({
  default: () => null,
}));
vi.mock("../services/groupApi", () => ({
  fetchGroup: mocks.fetch,
  subscribeToGroupChanges: () => vi.fn(),
  joinGroup: mocks.join,
}));
vi.mock("~/features/profile/services/profileApi", () => ({
  fetchBlockingState: mocks.blocking,
}));
const group: StudyGroup = {
  id: "abc",
  title: "Systems session",
  course: "15-213",
  purpose: "Exam",
  location: "Library",
  details: "",
  startTime: new Date("2099-01-01T12:00:00Z"),
  totalSeats: 2,
  participantDetails: [{ name: "Owner", email: "owner@cmu.edu", url: null }],
};
beforeEach(() => {
  mocks.fetch.mockResolvedValue(group);
  mocks.blocking.mockResolvedValue({
    blockedByMe: [],
    blockedByThem: [],
    joinedGroups: [],
  });
  mocks.calendar.mockResolvedValue(undefined);
  mocks.addCalendar.mockResolvedValue("calendar-event");
  mocks.join.mockResolvedValue(undefined);
});
test("opens a specific group without joining, then uses existing join/calendar flow", async () => {
  const userEventInstance = userEvent.setup();
  render(<SharedGroupPage groupId="abc" />);
  expect(
    await screen.findByRole("button", { name: "Join group" }),
  ).toBeEnabled();
  expect(mocks.join).not.toHaveBeenCalled();
  await userEventInstance.click(
    screen.getByRole("button", { name: "Join group" }),
  );
  expect(
    await screen.findByRole("button", { name: "Leave group" }),
  ).toBeVisible();
  expect(mocks.join).toHaveBeenCalledWith(
    expect.objectContaining({ groupId: "abc" }),
  );
  expect(mocks.calendar).toHaveBeenCalledOnce();
  expect(mocks.addCalendar).toHaveBeenCalledOnce();
});
test("deleted groups show an unavailable state", async () => {
  mocks.fetch.mockRejectedValue(new ApiRequestError("Missing", 404));
  render(<SharedGroupPage groupId="abc" />);
  expect(
    await screen.findByRole("heading", { name: "Group unavailable" }),
  ).toBeVisible();
});
test.each(["blockedByMe", "blockedByThem"])(
  "blocked groups are unavailable: %s",
  async (direction) => {
    mocks.blocking.mockResolvedValue({
      blockedByMe: [],
      blockedByThem: [],
      joinedGroups: [],
      [direction]: ["OWNER@cmu.edu"],
    });
    render(<SharedGroupPage groupId="abc" />);
    expect(
      await screen.findByRole("heading", { name: "Group unavailable" }),
    ).toBeVisible();
    expect(screen.queryByText("Systems session")).not.toBeInTheDocument();
  },
);
test("fetch errors offer a working retry", async () => {
  const u = userEvent.setup();
  mocks.fetch.mockRejectedValueOnce(new Error("offline"));
  render(<SharedGroupPage groupId="abc" />);
  await u.click(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Systems session")).toBeVisible();
});
test.each([
  ["full", { totalSeats: 1 }, "Group full"],
  ["past", { startTime: new Date("2000-01-01") }, "Session ended"],
])("%s groups disable joining", async (_kind, changes, label) => {
  mocks.fetch.mockResolvedValue({
    ...group,
    ...(changes as Partial<StudyGroup>),
  });
  render(<SharedGroupPage groupId="abc" />);
  expect(await screen.findByRole("button", { name: label })).toBeDisabled();
});
test("existing members can leave even if the session is full or past", async () => {
  mocks.fetch.mockResolvedValue({
    ...group,
    totalSeats: 1,
    startTime: new Date("2000-01-01"),
    participantDetails: [
      { name: "Student", email: "student@cmu.edu", url: null },
    ],
  });
  render(<SharedGroupPage groupId="abc" />);
  expect(
    await screen.findByRole("button", { name: "Leave group" }),
  ).toBeEnabled();
});
