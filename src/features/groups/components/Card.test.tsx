import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Card from "./Card";
import type { StudyGroup } from "~/types";

interface Props {
  onClick: (g: StudyGroup) => void;
  group: StudyGroup;
  time: string | null;
  date: string | null;
  isInGroup: boolean;
  selected: boolean;
}

const cardDummy: Props = {
  group: {
    course: "Course",
    details: "Details",
    id: "id",
    location: "location",
    participantDetails: [],
    purpose: "purpose",
    title: "title",
    startTime: new Date("2023-01-01T12:00:00Z"),
    totalSeats: 10,
  },
  time: "12:00 PM",
  date: "2023-01-01",
  isInGroup: false,
  selected: false,
  onClick: vi.fn(),
};

describe("Card.test", () => {
  test("selected is being applied", async () => {
    const { container } = render(
      <Card
        onClick={cardDummy.onClick}
        group={cardDummy.group}
        time={cardDummy.time}
        date={cardDummy.date}
        isInGroup={cardDummy.isInGroup}
        selected={true}
      />,
    );

    expect(container.firstChild).toHaveClass("study-card study-card-accent");
  });

  test("card class in not selected is being applied", () => {
    const { container } = render(
      <Card
        onClick={cardDummy.onClick}
        group={cardDummy.group}
        time={cardDummy.time}
        date={cardDummy.date}
        isInGroup={cardDummy.isInGroup}
        selected={false}
      />,
    );

    expect(container.firstChild).toHaveClass("study-card study-card-sidebar");
  });
});

const renderCard = (onClick = vi.fn()) =>
  render(<Card {...cardDummy} onClick={onClick} />);
beforeEach(() => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Macintosh");
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: 0,
  });
});
test("desktop card copies its group link without opening details or native sharing", async () => {
  const user = userEvent.setup();
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue();
  const share = vi.fn();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  const openDetails = vi.fn();
  const { container } = renderCard(openDetails);
  await user.click(screen.getByRole("button", { name: "Copy link" }));
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/groups/id`);
  expect(openDetails).not.toHaveBeenCalled();
  expect(share).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  expect(container.querySelector("button button")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Course: title" }));
  expect(openDetails).toHaveBeenCalledWith(cardDummy.group);
});
test.each(["iPhone", "Android", "iPad"])(
  "%s card opens the native share menu directly",
  async (userAgent) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    const openDetails = vi.fn();
    renderCard(openDetails);
    const invite = screen.getByRole("button", { name: "Invite friends" });
    expect(invite).toHaveAttribute("title", "Invite friends");
    await user.click(invite);
    expect(share).toHaveBeenCalledWith({
      title: "Study Course with me",
      text: "I'm looking for people to study Course with! Join my study group:",
      url: `${window.location.origin}/groups/id`,
    });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openDetails).not.toHaveBeenCalled();
  },
);
test("an iPad using a desktop user agent still offers invitations", async () => {
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: 5,
  });
  const user = userEvent.setup();
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  renderCard();
  await user.click(screen.getByRole("button", { name: "Invite friends" }));
  expect(share).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
