import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CreateAccountPage from "../src/app/create-account/page";
import { ProfileHeader } from "../src/features/profile/components/ProfileHeader";
import { useProfileSummary } from "../src/features/profile/hooks/useProfileSummary";

vi.mock("~/features/profile/hooks/useProfileSummary", () => ({
    useProfileSummary: vi.fn(),
}));

vi.mock("~/features/profile/hooks/useUserTheme", () => ({
    useUserTheme: vi.fn(),
}));

vi.mock("~/lib/auth-client", () => ({
    SignOutButton: ({ children }) => children,
    useUser: () => ({
        user: {
            fullName: "New Student",
            emailAddresses: [{ emailAddress: "new-student@example.edu" }],
        },
    }),
}));

vi.mock("~/features/profile/components/ProfileDetailsForm", () => ({
    ProfileDetailsForm: () => null,
}));

vi.mock("~/features/profile/components/ClassList", () => ({
    ClassList: () => null,
}));

const user = {
    fullName: "Existing Student",
    emailAddresses: [{ emailAddress: "student@example.edu" }],
};


describe("profile header class year", () => {
    beforeEach(() => {
        vi.mocked(useProfileSummary).mockReturnValue({});
    });

    // Ensure the profile header shows the correct text when a class has been specified
    test.each([
        ["a class year", "2028", "Class of 2028"],
        ["a master's program", "Masters Student", "Masters Student"],
        ["a PhD program", "PhD Student", "PhD Student"],
    ])("shows the expected label for %s", (_description, year, label) => {
        vi.mocked(useProfileSummary).mockReturnValue({ year });

        render(React.createElement(ProfileHeader, { user }));

        expect(screen.getByText(label)).toBeInTheDocument();
    });

    // No "Class of " text is shown when a new user is creating an account
    test("does not show a class label while a new user is creating an account", () => {
        render(React.createElement(CreateAccountPage));

        expect(
            screen.getByRole("heading", { name: "Set up CMU Study" }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Class of/)).not.toBeInTheDocument();
    });
});