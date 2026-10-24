import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { GroupShareAction } from "./GroupShareAction";
import { groupLink, invitationMessage } from "../utils/groupSharing";
import type { StudyGroup } from "~/types";
const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: notifications }));
const group: StudyGroup = {
  id: "abc",
  course: "15-213",
  purpose: "Exam prep",
  title: "Study",
  details: "",
  location: "Library",
  startTime: new Date(),
  totalSeats: 4,
  participantDetails: [],
};
beforeEach(() => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
});
test("prefills native sharing with exam text, subject and URL", async () => {
  const user = userEvent.setup();
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  render(<GroupShareAction group={group} />);
  await user.click(screen.getByRole("button", { name: "Invite friends" }));
  expect(share).toHaveBeenCalledWith({
    title: "Study 15-213 with me",
    text: "Anyone want to study for the 15-213 exam? Join here:",
    url: `${window.location.origin}/groups/abc`,
  });
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
test("cancellation is silent and re-enables the button", async () => {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: vi
      .fn()
      .mockRejectedValue(new DOMException("Canceled", "AbortError")),
  });
  render(<GroupShareAction group={group} />);
  await user.click(screen.getByRole("button", { name: "Invite friends" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Invite friends" }),
    ).toBeEnabled(),
  );
  expect(notifications.error).not.toHaveBeenCalled();
});
test("share errors show feedback and allow retry", async () => {
  const user = userEvent.setup();
  const share = vi
    .fn()
    .mockRejectedValueOnce(new DOMException("Failed", "DataError"))
    .mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  render(<GroupShareAction group={group} />);
  await user.click(screen.getByRole("button", { name: "Invite friends" }));
  expect(notifications.error).toHaveBeenCalledWith(
    "Could not open sharing. Please try again.",
  );
  await user.click(screen.getByRole("button", { name: "Invite friends" }));
  expect(share).toHaveBeenCalledTimes(2);
});
test("unsupported mobile browsers copy the full invitation without a site editor", async () => {
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<GroupShareAction group={group} />);
  await user.click(screen.getByRole("button", { name: "Invite friends" }));
  expect(copy).toHaveBeenCalledWith(
    invitationMessage(group, `${window.location.origin}/groups/abc`),
  );
  expect(notifications.success).toHaveBeenCalledWith(
    "Invitation copied. Paste it into your messaging or email app.",
  );
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
test("clipboard failure is reported without opening a message editor", async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
    new Error("Denied"),
  );
  render(<GroupShareAction group={group} />);
  await user.click(screen.getByRole("button", { name: "Invite friends" }));
  expect(notifications.error).toHaveBeenCalledWith(
    "Sharing is unavailable and the invitation could not be copied.",
  );
});
test("generates encoded links and casual invitations", () => {
  expect(groupLink("https://cmustudy.com", "a/b")).toBe(
    "https://cmustudy.com/groups/a%2Fb",
  );
  expect(
    invitationMessage({ course: "15-122", purpose: "Homework" }, "LINK"),
  ).toBe(
    "I'm looking for people to study 15-122 with! Join my study group! LINK",
  );
});
