import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { StudyGroup } from "~/types";

const group: StudyGroup = {
  id: "group-layout",
  title: "Calculus review",
  course: "21-120",
  purpose: "Practice derivatives",
  details: "Bring questions.",
  location: "Wean Hall",
  startTime: new Date("2030-01-01T15:00:00.000Z"),
  totalSeats: 4,
  participantDetails: [],
};

vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({
    user: {
      fullName: "Layout student",
      emailAddresses: [{ emailAddress: "layout@example.edu" }],
    },
  }),
}));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("~/lib/hooks", () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => undefined,
}));
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

import FeedPage from "./page";

const stylesheetPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../styles/components.css",
);

function lastRuleBody(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  return matches.length ? matches[matches.length - 1][1] : null;
}

describe("feed page filter bar layout", () => {
  test("filter bar is rendered before the New group button", () => {
    render(<FeedPage />);

    const searchInput = screen.getByRole("searchbox", { name: "Search groups" });
    const newGroupButton = screen.getByRole("button", { name: /new group/i });

    expect(
      searchInput.compareDocumentPosition(newGroupButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("New group button is rendered and visible on the page", () => {
    render(<FeedPage />);

    expect(screen.getByRole("button", { name: /new group/i })).toBeVisible();
  });

  test("filter bar is not sticky, so it cannot cover the New group button when scrolling", () => {
    const css = fs.readFileSync(stylesheetPath, "utf8");
    const topBarRule = lastRuleBody(css, ".top-bar");

    expect(topBarRule).not.toBeNull();
    expect(topBarRule).not.toMatch(/sticky/);
  });
});
