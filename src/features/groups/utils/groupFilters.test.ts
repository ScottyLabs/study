import { describe, expect, test } from "vitest";
import type { StudyGroup } from "~/types";
import { shouldHideBySharedFilters } from "./groupFilters";

function groupOn(date: string): StudyGroup {
  return {
    id: date,
    title: "Study session",
    course: "15-112",
    purpose: "Prepare for the exam",
    location: "Hunt Library",
    details: "Bring questions",
    startTime: new Date(date),
    totalSeats: 5,
    participantDetails: [],
  };
}

describe("shouldHideBySharedFilters date ranges", () => {
  test("does not filter by date when no date range is selected", () => {
    expect(
      shouldHideBySharedFilters({
        group: groupOn("2099-10-03T12:00:00"),
        selectedDateRange: [null, null],
      }),
    ).toBe(false);
  });

  test("matches only the selected calendar date when the range has no end date", () => {
    const selectedDateRange = [new Date(2099, 9, 2), null] as const;

    expect(
      shouldHideBySharedFilters({
        group: groupOn("2099-10-02T23:30:00"),
        selectedDateRange,
      }),
    ).toBe(false);
    expect(
      shouldHideBySharedFilters({
        group: groupOn("2099-10-03T00:30:00"),
        selectedDateRange,
      }),
    ).toBe(true);
  });

  test("includes both ends and every calendar day in a selected range", () => {
    const selectedDateRange = [
      new Date(2099, 9, 2),
      new Date(2099, 9, 5),
    ] as const;

    expect(
      shouldHideBySharedFilters({
        group: groupOn("2099-10-02T00:01:00"),
        selectedDateRange,
      }),
    ).toBe(false);
    expect(
      shouldHideBySharedFilters({
        group: groupOn("2099-10-04T12:00:00"),
        selectedDateRange,
      }),
    ).toBe(false);
    expect(
      shouldHideBySharedFilters({
        group: groupOn("2099-10-05T23:59:00"),
        selectedDateRange,
      }),
    ).toBe(false);
    expect(
      shouldHideBySharedFilters({
        group: groupOn("2099-10-06T00:00:00"),
        selectedDateRange,
      }),
    ).toBe(true);
  });

  test("matches ranges that cross a year boundary", () => {
    const selectedDateRange = [
      new Date(2099, 11, 31),
      new Date(2100, 0, 2),
    ] as const;

    expect(
      shouldHideBySharedFilters({
        group: groupOn("2100-01-01T12:00:00"),
        selectedDateRange,
      }),
    ).toBe(false);
  });
});
