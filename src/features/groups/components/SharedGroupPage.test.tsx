import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { SharedGroupPage } from "./SharedGroupPage";
import { ApiRequestError } from "~/lib/api/client";
import type { StudyGroup } from "~/types";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  fetchAll: vi.fn(),
  blocking: vi.fn(),
  push: vi.fn(),
  join: vi.fn(),
  calendar: vi.fn(),
  addCalendar: vi.fn(),
  capture: vi.fn(),
  sessionReady: true,
}));
const user = {
  fullName: "Student",
  emailAddresses: [{ emailAddress: "student@cmu.edu" }],
};
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({ user: mocks.sessionReady ? user : null }),
}));
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
  fetchGroups: mocks.fetchAll,
  subscribeToGroupChanges: () => vi.fn(),
  joinGroup: mocks.join,
}));
vi.mock("~/features/profile/services/profileApi", () => ({
  fetchBlockingState: mocks.blocking,
}));
vi.mock("~/features/profile/hooks/useUserCourses", () => ({
  useUserCourses: () => ({ classes: [] }),
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
  mocks.sessionReady = true;
  mocks.fetch.mockResolvedValue(group);
  mocks.fetchAll.mockResolvedValue([group]);
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
  expect(screen.getByRole("heading", { name: "Group Finder" })).toBeVisible();
  expect(screen.getByRole("button", { name: "New group" })).toBeVisible();
  expect(
    screen
      .getByRole("button", { name: "Join group" })
      .closest(".workspace-detail"),
  ).not.toBeNull();
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
  expect(
    await screen.findByRole("dialog", { name: "Systems session details" }),
  ).toBeVisible();
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

test("a newly signed-in recipient gets Join in the mobile overlay on first load", async () => {
  const media = window.matchMedia("(max-width: 767px)");
  vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
  const previousOverflow = document.body.style.overflow;
  mocks.sessionReady = false;
  const { rerender, unmount } = render(<SharedGroupPage groupId="abc" />);
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("Loading group...");

  // The auth client becomes ready after returning from account setup.
  mocks.sessionReady = true;
  rerender(<SharedGroupPage groupId="abc" />);
  const join = await screen.findByRole("button", { name: "Join group" });
  expect(join).toBeEnabled();
  // Scroll locking requires the same viewport overlay used in the feed;
  // rendering inline below navigation puts the footer outside a short screen.
  expect(join.closest(".details-overlay-inner")).not.toBeNull();
  expect(join.closest(".details-overlay")).not.toBeNull();
  expect(document.body.style.overflow).toBe("hidden");
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.join).not.toHaveBeenCalled();
  unmount();
  expect(document.body.style.overflow).toBe(previousOverflow);
});

test("closing the shared group's overlay returns to the feed", async () => {
  const u = userEvent.setup();
  render(<SharedGroupPage groupId="abc" />);
  await screen.findByRole("button", { name: "Join group" });
  await u.click(screen.getByRole("button", { name: "Close details" }));
  expect(mocks.push).toHaveBeenCalledWith("/feed");
});

test("the shared link shows the normal group cards beside the selected details", async () => {
  const u = userEvent.setup();
  const otherGroup = { ...group, id: "other", title: "Another session" };
  mocks.fetchAll.mockResolvedValue([group, otherGroup]);
  mocks.fetch.mockImplementation(async (id: string) =>
    id === "other" ? otherGroup : group,
  );
  render(<SharedGroupPage groupId="abc" />);
  expect(
    await screen.findByRole("dialog", { name: "Systems session details" }),
  ).toBeVisible();
  const otherCard = await screen.findByRole("button", {
    name: "15-213: Another session",
  });
  expect(
    screen
      .getByRole("button", { name: "15-213: Systems session" })
      .closest("article"),
  ).toHaveClass("study-card-accent");
  await u.click(otherCard);
  expect(
    await screen.findByRole("dialog", { name: "Another session details" }),
  ).toBeVisible();
});
