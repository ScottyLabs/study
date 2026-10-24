import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ShareGroupModal } from "./ShareGroupModal";
import { groupLink, invitationMessage } from "../utils/groupSharing";
import type { StudyGroup } from "~/types";

const group: StudyGroup = {
  id: "abc-123",
  course: "15-213",
  purpose: "Homework",
  title: "Study",
  details: "",
  location: "Library",
  startTime: new Date(),
  totalSeats: 4,
  participantDetails: [],
};
beforeEach(() => {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
});

describe("group invitations", () => {
  test("builds encoded links and course-aware defaults", () => {
    expect(groupLink("https://cmustudy.com", "a/b")).toBe(
      "https://cmustudy.com/groups/a%2Fb",
    );
    expect(invitationMessage(group, "LINK")).toBe(
      "I'm looking for people to study 15-213 with! Join my study group: LINK",
    );
    expect(invitationMessage({ ...group, purpose: "EXAM prep" }, "LINK")).toBe(
      "Anyone want to study for the 15-213 exam? Join here: LINK",
    );
  });
  test("copies edited message and encodes the email draft", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    render(<ShareGroupModal group={group} onClose={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: "Share" }),
    ).not.toBeInTheDocument();
    const editor = screen.getByRole("textbox", { name: "Message" });
    await user.clear(editor);
    await user.type(editor, "Let's study & chat?\nJoin me!");
    const message = "Let's study & chat?\nJoin me!";
    const email = screen.getByRole("link", { name: "Email" });
    expect(email).toHaveAttribute(
      "href",
      `mailto:?subject=${encodeURIComponent("Study 15-213 with me")}&body=${encodeURIComponent(message)}`,
    );
    await user.click(screen.getByRole("button", { name: "Copy message" }));
    expect(writeText).toHaveBeenLastCalledWith(message);
    expect(screen.getByRole("status")).toHaveTextContent("Message copied");
    expect(screen.queryByLabelText("Group link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy link" }),
    ).not.toBeInTheDocument();
  });
  test("native sharing provides a separate URL without duplicating it in text", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    render(<ShareGroupModal group={group} onClose={vi.fn()} />);
    const link = `${window.location.origin}/groups/abc-123`;
    await user.clear(screen.getByLabelText("Message"));
    await user.type(
      screen.getByLabelText("Message"),
      `Let's study together! Join here: ${link}`,
    );
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith({
      title: "Study 15-213 with me",
      text: "Let's study together! Join here:",
      url: link,
    });
    expect(screen.getByLabelText("Message")).toHaveValue(
      `Let's study together! Join here: ${link}`,
    );
    await user.click(screen.getByRole("button", { name: "Copy message" }));
    expect(screen.getByRole("status")).toHaveTextContent("Message copied");
  });
  test("native share failures keep the copy fallback available", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("Failed", "DataError")),
    });
    render(<ShareGroupModal group={group} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Could not open sharing",
    );
    expect(screen.getByRole("button", { name: "Copy message" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Share" })).toBeEnabled();
  });
  test("native sharing uses edited text and cancellation is silent", async () => {
    const user = userEvent.setup();
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("Canceled", "AbortError"));
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    render(<ShareGroupModal group={group} onClose={vi.fn()} />);
    await user.clear(screen.getByLabelText("Message"));
    await user.type(screen.getByLabelText("Message"), "My invitation");
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith({
      title: "Study 15-213 with me",
      text: "My invitation",
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Share" })).toBeEnabled(),
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
  test("clipboard failure keeps invitation selectable", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("Denied"),
    );
    render(<ShareGroupModal group={group} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Copy message" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Select the text above",
    );
    expect(screen.getByLabelText("Message")).toHaveValue(
      invitationMessage(group, `${window.location.origin}/groups/abc-123`),
    );
  });
  test("reopening resets edits and closing restores focus", async () => {
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const close = vi.fn();
    const { unmount } = render(
      <ShareGroupModal group={group} onClose={close} />,
    );
    await user.clear(screen.getByLabelText("Message"));
    await user.keyboard("{Escape}");
    expect(close).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    render(<ShareGroupModal group={group} onClose={close} />);
    expect(screen.getByLabelText("Message")).toHaveValue(
      invitationMessage(group, `${window.location.origin}/groups/abc-123`),
    );
    trigger.remove();
  });
});
