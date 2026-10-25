import { beforeEach, describe, expect, test, vi } from "vitest";
import { groupDestination } from "./group-destination";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  profile: vi.fn(),
  eligibility: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("~/lib/auth", () => ({ requireServerSession: mocks.session }));
vi.mock("~/features/profile/services/serverAccountService", () => ({
  userHasCreatedProfile: mocks.profile,
}));
vi.mock("~/server/eligibility/service", () => ({
  getUserEligibility: mocks.eligibility,
}));
import { requireContentAccess } from "./require-content-access";
import LoginPage from "~/app/login/page";
beforeEach(() => {
  mocks.session.mockResolvedValue({
    user: { id: "user", email: "user@cmu.edu", andrewID: "user" },
  });
  mocks.profile.mockResolvedValue(true);
  mocks.eligibility.mockResolvedValue("ELIGIBLE");
});
describe("invitation authentication destination", () => {
  test.each([
    undefined,
    "https://evil.test",
    "//evil.test",
    "/groups/../login",
    "/groups/a?next=evil",
    "/feed",
    ["/groups/a"],
    "/groups/%2f%2fevil",
  ])("rejects unsafe destination %s", (value) => {
    expect(groupDestination(value)).toBe("/feed");
  });
  test("returns eligible users to the group", async () => {
    await expect(
      LoginPage({ searchParams: { next: "/groups/abc-123" } }),
    ).rejects.toThrow("REDIRECT:/groups/abc-123");
  });
  test("preserves group destination for signed out users", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(requireContentAccess("/groups/abc-123")).rejects.toThrow(
      "REDIRECT:/?next=%2Fgroups%2Fabc-123",
    );
    expect(mocks.eligibility).not.toHaveBeenCalled();
  });
  test("preserves destination through account setup", async () => {
    mocks.profile.mockResolvedValue(false);
    await expect(requireContentAccess("/groups/abc-123")).rejects.toThrow(
      "REDIRECT:/create-account?next=%2Fgroups%2Fabc-123",
    );
    await expect(requireContentAccess(undefined, false)).resolves.toBeTruthy();
  });
  test.each([
    ["INELIGIBLE", "/access-restricted"],
    ["UNAVAILABLE", "/eligibility-unavailable"],
  ])("keeps eligibility gate for %s", async (eligibility, route) => {
    mocks.eligibility.mockResolvedValue(eligibility);
    await expect(requireContentAccess("/groups/abc-123")).rejects.toThrow(
      `REDIRECT:${route}`,
    );
  });
  test("invalid destinations fall back to feed", async () => {
    await expect(
      LoginPage({ searchParams: { next: "https://evil.test" } }),
    ).rejects.toThrow("REDIRECT:/feed");
  });
});
