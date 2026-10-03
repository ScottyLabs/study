import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({ push: vi.fn() }));
const profileApiMocks = vi.hoisted(() => ({ fetchCourseCodes: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerMocks.push }),
}));
vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({
    user: {
      fullName: "New student",
      emailAddresses: [{ emailAddress: "new@example.edu" }],
    },
  }),
}));
vi.mock("~/features/profile/hooks/useUserTheme", () => ({
  useUserTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));
vi.mock("~/features/profile/services/profileApi", () => ({
  fetchCourseCodes: profileApiMocks.fetchCourseCodes,
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

import CreateAccountPage from "./page";

const COURSE_REQUIRED_MESSAGE = "Add at least one course to continue.";

describe("create account course requirement", () => {
  test("does not show the course popup on first load", () => {
    profileApiMocks.fetchCourseCodes.mockResolvedValue([]);
    render(<CreateAccountPage />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText(COURSE_REQUIRED_MESSAGE)).not.toBeInTheDocument();
  });

  test("shows the popup and stays on the page when Continue is clicked with no courses", async () => {
    const user = userEvent.setup();
    profileApiMocks.fetchCourseCodes.mockResolvedValue([]);
    render(<CreateAccountPage />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alertdialog")).toBeVisible();
    expect(screen.getByText(COURSE_REQUIRED_MESSAGE)).toBeVisible();
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  test("closes the popup when OK is clicked", async () => {
    const user = userEvent.setup();
    profileApiMocks.fetchCourseCodes.mockResolvedValue([]);
    render(<CreateAccountPage />);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "OK" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  test("goes to the feed when at least one course is saved", async () => {
    const user = userEvent.setup();
    profileApiMocks.fetchCourseCodes.mockResolvedValue(["21-120"]);
    render(<CreateAccountPage />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(routerMocks.push).toHaveBeenCalledWith("/feed"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("checks saved courses when Continue is clicked, not when the page loaded", async () => {
    const user = userEvent.setup();
    profileApiMocks.fetchCourseCodes.mockResolvedValue([]);
    render(<CreateAccountPage />);

    profileApiMocks.fetchCourseCodes.mockResolvedValue(["21-120"]);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(routerMocks.push).toHaveBeenCalledWith("/feed"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
