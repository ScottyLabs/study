import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({
    user: {
      fullName: "Alex Student",
      emailAddresses: [{ emailAddress: "alex@example.edu" }],
    },
  }),
}));
vi.mock("~/features/profile/hooks/useProfileSummary", () => ({
  useProfileSummary: () => ({ year: "2028", majors: "Computer Science" }),
}));
vi.mock("~/features/profile/hooks/useProfileDetails", () => ({
  useProfileDetails: () => ({
    profileDetails: { year: "2028", majors: "Computer Science", minors: "" },
    updateProfileDetails: vi.fn(),
  }),
}));
vi.mock("~/features/profile/components/ClassList", () => ({
  ClassList: () => <p>Selected courses</p>,
}));
vi.mock("~/features/profile/components/BlockList", () => ({
  BlockList: () => <p>Blocked student list</p>,
}));

import ProfilePage from "./page";

describe("profile account details priority", () => {
  test("shows account details after the identity header and before both other sections", () => {
    render(<ProfilePage />);

    const identity = screen.getByRole("heading", { name: "Alex Student" });
    const sections = screen.getAllByRole("heading", { level: 2 });
    expect(sections.map((heading) => heading.textContent)).toEqual([
      "Account details",
      "My courses",
      "Blocked users",
    ]);

    const account = screen.getByRole("heading", { name: "Account details" });
    expect(identity.compareDocumentPosition(account)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText("alex@example.edu")).toBeVisible();

    // Check the content is rendered too, not only the section headings.
    const accountSection = account.closest("section")!;
    expect(
      within(accountSection).getByRole("combobox", { name: "Class year" }),
    ).toBeVisible();
    expect(
      within(accountSection).getByRole("textbox", { name: "Major" }),
    ).toBeVisible();
    expect(screen.getByText("Selected courses")).toBeVisible();
    expect(screen.getByText("Blocked student list")).toBeVisible();
  });

  test("Edit profile scrolls to the account details section", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    const accountSection = screen
      .getByRole("heading", { name: "Account details" })
      .closest("section")!;
    // jsdom has no scrolling implementation; observe the target and options.
    const scrollIntoView = vi.fn();
    accountSection.scrollIntoView = scrollIntoView;

    await user.click(screen.getByRole("button", { name: "Edit profile" }));

    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
      behavior: "smooth",
      block: "start",
    });
  });
});
