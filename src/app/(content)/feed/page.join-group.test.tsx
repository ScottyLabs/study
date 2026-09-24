import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { StudyGroup } from "~/types";

const group: StudyGroup = {
  id: "group-not-joined",
  title: "Calculus review",
  course: "21-120",
  purpose: "Practice derivatives",
  details: "Bring questions.",
  location: "Wean Hall",
  startTime: new Date("2030-01-01T15:00:00.000Z"),
  totalSeats: 4,
  participantDetails: [
    {
      name: "Group owner",
      email: "owner@example.edu",
      url: null,
      eventId: "owner-event",
    },
  ],
};

vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({
    user: {
      fullName: "Joining student",
      emailAddresses: [{ emailAddress: "joiner@example.edu" }],
    },
  }),
}));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("posthog-js/react", () => ({ usePostHog: () => ({ capture: vi.fn() }) }));
vi.mock("~/features/groups/hooks/useStudyGroups", () => ({
  useStudyGroups: () => [group],
}));
vi.mock("~/features/groups/hooks/useUserGroupState", () => ({
  useUserGroupState: () => ({
    joinedGroups: [],
    setJoinedGroups: vi.fn(),
    blockedUsers: [],
  }),
}));
vi.mock("~/features/profile/hooks/useUserCourses", () => ({
  useUserCourses: () => ({ classes: [] }),
}));
vi.mock("~/features/groups/hooks/useLiveGroupDetails", () => ({
  useLiveGroupDetails: () => ({
    currentDetails: group,
    isJoined: false,
    setIsJoined: vi.fn(),
    eventId: "None",
    isDeleted: false,
  }),
}));
vi.mock("~/features/groups/services/groupApi", () => ({
  joinGroup: vi.fn(),
  leaveGroup: vi.fn(),
}));
vi.mock("~/helpers/calendar_helper", () => ({
  addToCal: vi.fn(),
  deleteFromCal: vi.fn(),
  isCalendarApiReady: vi.fn(() => false),
  requestCalendarAccessInteractive: vi.fn(),
  setupGoogleApi: vi.fn(() => Promise.resolve()),
}));
vi.mock("~/features/groups/components/EditGroupModal", () => ({
  default: () => null,
}));
vi.mock("~/features/profile/components/CreateProfilePopUp", () => ({
  default: () => null,
}));
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

import FeedPage from "./page";

describe("feed Join Group entry point", () => {
  test("opens an unjoined group and shows its Join button", async () => {
    const user = userEvent.setup();
    render(<FeedPage />);

    await user.click(
      screen.getByRole("button", { name: /calculus review/i }),
    );

    expect(screen.getByRole("button", { name: "Join group" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Leave group" }),
    ).not.toBeInTheDocument();
  });
});
