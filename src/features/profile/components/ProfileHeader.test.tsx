import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";

import { describe, expect, test, vi } from "vitest";

import { ProfileHeader } from "./ProfileHeader";

vi.mock("~/features/profile/hooks/useProfileSummary", () => ({
  useProfileSummary: () => ({
    majors: null,
    year: null,
  }),
}));

vi.mock("~/components/ui/UserAvatar", () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));

vi.mock("~/lib/auth-client", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("ProfileHeader", () => {
  test("does not show the Edit profile button", () => {
    render(
      <ProfileHeader
        user={{
          fullName: "Test User",
          emailAddresses: [{ emailAddress: "test@andrew.cmu.edu" }],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Test User" })).toBeVisible();

    expect(
      screen.queryByRole("button", { name: /edit profile/i }),
    ).not.toBeInTheDocument();
  });
});