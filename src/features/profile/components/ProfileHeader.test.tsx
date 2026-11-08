import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { ProfileHeader } from "./ProfileHeader";

const summaryMocks = vi.hoisted(() => ({
  useProfileSummary: vi.fn(),
}));

vi.mock("~/features/profile/hooks/useProfileSummary", () => summaryMocks);

vi.mock("~/components/ui/UserAvatar", () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));

vi.mock("~/lib/auth-client", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const user = {
  fullName: "Test User",
  emailAddresses: [{ emailAddress: "test@andrew.cmu.edu" }],
};

describe("ProfileHeader", () => {
  beforeEach(() => {
    summaryMocks.useProfileSummary.mockReturnValue({ majors: null, year: null });
  });

  test("does not show the Edit profile button", () => {
    render(<ProfileHeader user={user} />);

    expect(screen.getByRole("heading", { name: "Test User" })).toBeVisible();

    expect(screen.queryByRole("button", { name: /edit profile/i })).not.toBeInTheDocument();
  });

  test.each([
    ["a class year", "2028", "Class of 2028"],
    ["a master's program", "Masters Student", "Masters Student"],
    ["a PhD program", "PhD Student", "PhD Student"],
  ])("shows the expected label for %s", (_description, year, label) => {
    summaryMocks.useProfileSummary.mockReturnValue({ majors: null, year });

    render(<ProfileHeader user={user} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  test("shows no class label before a year is set", () => {
    render(<ProfileHeader user={user} />);

    expect(screen.queryByText(/Class of/)).not.toBeInTheDocument();
  });
});
