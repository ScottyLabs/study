import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { JoinGroupButton } from "./JoinGroupButton";
import Card from "./Card";
import { StudyGroup } from "~/types";

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
  onClick: () => {},
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
