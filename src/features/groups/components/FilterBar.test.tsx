/*
This test file guarantees 
a) typing in the search bar triggers a query
b) available courses appear when that filter is used
c) selecting a course triggers the handler
d) a selected date is displayed in the date input
*/

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import TopFilterBar from "./FilterBar";

const courseOptions = [
  { value: "15-112", label: "15-112" },
  { value: "15-122", label: "15-122" },
];

const defaultProps = {
  courseOptions,
  selectedCourses: [],
  setSelectedCourses: vi.fn(),
  selectedDate: null,
  setSelectedDate: vi.fn(),
  searchQuery: "",
  setSearchQuery: vi.fn(),
};
// when the user types into the search, setSearchQuery should be called. Rest of these feel pretty self-explanantory.
describe("TopFilterBar", () => {
  test("shows the search input and calls its handler when the user types", async () => {
    const user = userEvent.setup();
    const setSearchQuery = vi.fn();

    render(
      <TopFilterBar
        {...defaultProps}
        setSearchQuery={setSearchQuery}
      />,
    );

    const searchInput = screen.getByRole("searchbox", {
      name: "Search groups",
    });

    await user.type(searchInput, "15-122");
    // setSearchQuery is called individually on each input ith
    expect(setSearchQuery).toHaveBeenLastCalledWith("2");
  });
  test("renders the course options when the course selector is opened", async () => {
    const user = userEvent.setup();

    render(<TopFilterBar {...defaultProps} />);

    await user.click(screen.getByText("All courses"));

    expect(screen.getByText("15-112")).toBeVisible();
    expect(screen.getByText("15-122")).toBeVisible();
  });

  test("calls the course handler when a course is selected", async () => {
    const user = userEvent.setup();
    const setSelectedCourses = vi.fn();

    render(
      <TopFilterBar
        {...defaultProps}
        setSelectedCourses={setSelectedCourses}
      />,
    );

    await user.click(screen.getByText("All courses"));
    await user.click(screen.getByText("15-122"));

    expect(setSelectedCourses).toHaveBeenCalledOnce();
    expect(setSelectedCourses).toHaveBeenCalledWith(
        [{ value: "15-122", label: "15-122" }],
        expect.objectContaining({
            action: "select-option",
        }),
    );
  });

  test("renders the selected date", () => {
    const selectedDate = new Date(2026, 9, 2);

    render(
      <TopFilterBar
        {...defaultProps}
        selectedDate={selectedDate}
      />,
    );

    expect(screen.getByDisplayValue("10/02/2026")).toBeInTheDocument();
  });
});
