import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import GroupDetails from "~/features/groups/components/GroupDetails";
import { api } from "~/server/api/app";
import { db } from "~/server/db";
import type { StudyGroup } from "~/types";
import {
  disconnectTestDatabase,
  integrationDatabaseConfigured,
  resetTestDatabase,
} from "./database";
import { createTestGroup, createTestUser } from "./factories";

const authMocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const toastMocks = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("~/lib/auth", () => ({
  auth: { api: { getSession: authMocks.getSession } },
}));
vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({
    user: {
      fullName: "Joining student",
      imageUrl: "https://example.edu/joiner.png",
      emailAddresses: [{ emailAddress: "joiner@example.edu" }],
    },
  }),
}));
vi.mock("~/server/eligibility/service", () => ({
  getUserEligibility: vi.fn(async () => "ELIGIBLE"),
}));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("posthog-js/react", () => ({ usePostHog: () => ({ capture: vi.fn() }) }));
vi.mock("~/helpers/calendar_helper", () => ({
  addToCal: vi.fn(async () => "calendar-event-from-ui"),
  deleteFromCal: vi.fn(async () => true),
  isCalendarApiReady: vi.fn(() => false),
  requestCalendarAccessInteractive: vi.fn(),
  setupGoogleApi: vi.fn(async () => undefined),
}));
vi.mock("~/features/groups/components/EditGroupModal", () => ({
  default: () => null,
}));
vi.mock("~/features/profile/components/CreateProfilePopUp", () => ({
  default: () => null,
}));
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), toastMocks),
}));

const integrationTest = integrationDatabaseConfigured ? test : test.skip;

function fetchViaInProcessApi(input: RequestInfo | URL, init?: RequestInit) {
  const request =
    input instanceof Request
      ? input
      : new Request(new URL(String(input), "http://localhost"), init);
  return api.fetch(request);
}

describe("GroupDetails Join Group vertical pipeline", () => {
  beforeEach(resetTestDatabase);
  afterEach(() => {
    vi.unstubAllGlobals();
    return resetTestDatabase();
  });
  afterAll(disconnectTestDatabase);

  integrationTest("clicking Join calls the real API and creates the membership row", async () => {
    const owner = await createTestUser({ id: "owner", email: "owner@example.edu" });
    const joiner = await createTestUser({ id: "joiner", email: "joiner@example.edu" });
    const group = await createTestGroup({ ownerId: owner.id });
    authMocks.getSession.mockResolvedValue({
      user: { id: joiner.id, andrewID: joiner.andrewID },
    });
    vi.stubGlobal("fetch", vi.fn(fetchViaInProcessApi));

    const details: StudyGroup = {
      id: group.id,
      course: group.courseCode,
      title: group.title,
      purpose: group.purpose,
      details: group.details,
      location: group.location,
      startTime: group.startTime,
      totalSeats: group.totalSeats,
      participantDetails: [
        {
          name: owner.name,
          email: owner.email,
          url: owner.image,
          eventId: "owner-event",
        },
      ],
    };
    const updateJoinedGroups = vi.fn();
    const user = userEvent.setup();

    render(
      <GroupDetails
        details={details}
        onClick={vi.fn()}
        updateJoinedGroups={updateJoinedGroups}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Join group" }),
    );

    await waitFor(async () => {
      await expect(
        db.groupMembership.findUnique({
          where: { groupId_userId: { groupId: group.id, userId: joiner.id } },
        }),
      ).resolves.toMatchObject({ calendarEventId: "calendar-event-from-ui" });
    });
    expect(
      await screen.findByRole("button", { name: "Leave group" }),
    ).toBeVisible();
    expect(toastMocks.success).toHaveBeenCalledWith("Joined group");
    expect(updateJoinedGroups).toHaveBeenCalledOnce();
  });
});
