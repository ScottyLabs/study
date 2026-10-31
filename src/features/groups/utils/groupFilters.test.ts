import { describe, expect, test } from "vitest";
import type { StudyGroup } from "~/types";
import { shouldHideBySharedFilters, shouldHideFeedGroup } from "./groupFilters";

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

describe("shouldHideFeedGroup availability", () => {
  const busy = [{ start: "2099-10-02T15:00:00Z", end: "2099-10-02T16:00:00Z" }];
  const hidden = (startTime: string, joinedGroups: string[] = []) =>
    shouldHideFeedGroup({
      group: groupOn(startTime),
      joinedGroups,
      showFullFilter: true,
      busyIntervals: busy,
    });

  test("hides a group whose hour overlaps a busy time", () => {
    expect(hidden("2099-10-02T14:30:00Z")).toBe(true);
    expect(hidden("2099-10-02T15:30:00Z")).toBe(true);
  });

  test("keeps groups that only touch a busy time at its edges", () => {
    expect(hidden("2099-10-02T14:00:00Z")).toBe(false);
    expect(hidden("2099-10-02T16:00:00Z")).toBe(false);
  });

  test("never hides a group the user joined", () => {
    expect(hidden("2099-10-02T15:00:00Z", ["2099-10-02T15:00:00Z"])).toBe(
      false,
    );
  });

  test("changes nothing when availability was not loaded", () => {
    expect(
      shouldHideFeedGroup({
        group: groupOn("2099-10-02T15:00:00Z"),
        showFullFilter: true,
        busyIntervals: null,
      }),
    ).toBe(false);
  });
});
