import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import MobileNavBar from "./MobileNavBar";

vi.mock("next/navigation", () => ({ usePathname: () => "/feed" }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("~/lib/auth-client", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => children,
  useUser: () => ({
    user: {
      fullName: "Study Student",
      emailAddresses: [{ emailAddress: "student@example.edu" }],
    },
  }),
}));
vi.mock("~/features/profile/hooks/useUserTheme", () => ({
  useUserTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

test("keeps Profile only in the mobile bottom navigation", async () => {
  const user = userEvent.setup();
  render(<MobileNavBar />);

  expect(screen.queryByRole("link", { name: "Open profile" })).not.toBeInTheDocument();
  expect(
    within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole(
      "link",
      { name: "Profile" },
    ),
  ).toHaveAttribute("href", "/profile");

  await user.click(screen.getByRole("button", { name: "Open navigation menu" }));

  expect(
    within(screen.getByRole("complementary")).queryByRole("link", {
      name: "Profile",
    }),
  ).not.toBeInTheDocument();
});
