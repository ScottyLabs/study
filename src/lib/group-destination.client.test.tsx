import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  next: "/groups/abc-123",
  signedIn: false,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams({ next: mocks.next }),
}));
vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({
    user: mocks.signedIn
      ? { emailAddresses: [{ emailAddress: "student@cmu.edu" }] }
      : null,
  }),
  SignedIn: ({ children }: { children: ReactNode }) =>
    mocks.signedIn ? children : null,
  SignedOut: ({ children }: { children: ReactNode }) =>
    mocks.signedIn ? null : children,
  SignInButton: ({
    children,
    forceRedirectUrl,
  }: {
    children: ReactNode;
    forceRedirectUrl: string;
  }) => (
    <div data-testid="signin" data-callback={forceRedirectUrl}>
      {children}
    </div>
  ),
}));
vi.mock("~/features/profile/components/ClassList", () => ({
  ClassList: () => null,
}));
vi.mock("~/features/profile/components/ProfileDetailsForm", () => ({
  ProfileDetailsForm: () => null,
}));
vi.mock("~/features/profile/components/ProfileHeader", () => ({
  ProfileHeader: () => null,
}));
vi.mock("~/features/profile/hooks/useUserTheme", () => ({
  useUserTheme: vi.fn(),
}));
import HomePage from "~/app/page";
import CreateAccountPage from "~/app/create-account/page";
beforeEach(() => {
  mocks.next = "/groups/abc-123";
  mocks.signedIn = false;
});
test("every landing-page sign-in action carries the group destination", () => {
  render(<HomePage />);
  for (const button of screen.getAllByTestId("signin")) {
    expect(button).toHaveAttribute(
      "data-callback",
      "/login?next=%2Fgroups%2Fabc-123",
    );
  }
});
test("signed-in landing redirect preserves the destination", async () => {
  mocks.signedIn = true;
  render(<HomePage />);
  await waitFor(() =>
    expect(mocks.replace).toHaveBeenCalledWith(
      "/login?next=%2Fgroups%2Fabc-123",
    ),
  );
});
test("account setup Continue returns to the group", () => {
  render(<CreateAccountPage />);
  expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
    "href",
    "/groups/abc-123",
  );
});
test("unsafe destinations fall back to feed after setup", () => {
  mocks.next = "//evil.test";
  render(<CreateAccountPage />);
  expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
    "href",
    "/feed",
  );
});
