import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import NavBar from "./NavBar";

vi.mock("next/navigation", () => ({ usePathname: () => "/my-groups" }));
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
vi.mock("~/components/ui/UserAvatar", () => ({
  UserAvatar: () => <span>Avatar</span>,
}));
vi.mock("~/components/layout/MobileNavBar", () => ({
  default: () => null,
}));
vi.mock("~/features/groups/components/CreateGroupModal", () => ({
  default: () => null,
}));
vi.mock("~/features/profile/hooks/useUserTheme", () => ({
  useUserTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

test("does not render a duplicate Profile link in the sidebar navigation", () => {
  render(<NavBar />);

  const sidebar = screen.getByRole("complementary", {
    name: "Primary navigation",
  });
  const primaryLinks = within(
    sidebar.querySelector(".sidebar-nav")!,
  ).getAllByRole("link");

  expect(primaryLinks.map((link) => link.getAttribute("href"))).toEqual([
    "/feed",
    "/my-groups",
  ]);
  expect(sidebar.querySelector(".sidebar-account")).toHaveAttribute(
    "href",
    "/profile",
  );
});
