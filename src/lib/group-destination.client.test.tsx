import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  next: "/groups/abc-123",
  signedIn: false,
  courseCodes: ["15-112"],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
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
vi.mock("~/features/profile/services/profileApi", () => ({
  fetchCourseCodes: () => Promise.resolve(mocks.courseCodes),
}));
import HomePage from "~/app/page";
import CreateAccountPage from "~/app/create-account/page";
beforeEach(() => {
  mocks.next = "/groups/abc-123";
  mocks.signedIn = false;
  mocks.courseCodes = ["15-112"];
  mocks.push.mockReset();
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
test("account setup Continue returns to the group", async () => {
  render(<CreateAccountPage />);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith("/groups/abc-123"),
  );
});
test("unsafe destinations fall back to feed after setup", async () => {
  mocks.next = "//evil.test";
  render(<CreateAccountPage />);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith("/feed"),
  );
});
