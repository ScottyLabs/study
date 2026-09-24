import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { JoinGroupButton } from "./JoinGroupButton";

describe("JoinGroupButton", () => {
  test("shows Join and calls its handler for a user who is not a member", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<JoinGroupButton isJoined={false} onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Join group" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  test("shows Leave for an existing member", () => {
    render(<JoinGroupButton isJoined={true} onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Leave group" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Join group" }),
    ).not.toBeInTheDocument();
  });
});
