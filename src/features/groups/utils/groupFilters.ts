import { isInThePast } from "~/helpers/date_helper";
import type { DateFilterRange, StudyGroup } from "~/types";

type GroupFilterInput = {
  group: StudyGroup;
  selectedDateRange?: DateFilterRange;
  selectedCourseValues?: string[];
};

type FeedGroupFilterInput = GroupFilterInput & {
  joinedGroups?: string[] | null;
  blockedUsers?: string[];
  showFullFilter: boolean;
};

function isSameCalendarDate(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getDate() === secondDate.getDate() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getFullYear() === secondDate.getFullYear()
  );
}

function isCalendarDateInRange(date: Date, startDate: Date, endDate: Date) {
  const calendarDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const firstCalendarDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const lastCalendarDate = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  return (
    calendarDate.getTime() >= firstCalendarDate.getTime() &&
    calendarDate.getTime() <= lastCalendarDate.getTime()
  );
}

function hasSelectedValue(selectedValues: string[] | undefined, value: string) {
  return !selectedValues?.length || selectedValues.includes(value);
}

function hasBlockedParticipant(group: StudyGroup, blockedUsers: string[] = []) {
  if (!blockedUsers.length) return false;

  return group.participantDetails.some((participant) =>
    blockedUsers.includes(participant.email?.toLowerCase() || ""),
  );
}

export function shouldHideBySharedFilters({
  group,
  selectedDateRange,
  selectedCourseValues,
}: GroupFilterInput) {
  if (isInThePast(group.startTime)) return true;

  const [startDate, endDate] = selectedDateRange ?? [];
  const matchesDate =
    !startDate ||
    (endDate
      ? isCalendarDateInRange(group.startTime, startDate, endDate)
      : isSameCalendarDate(group.startTime, startDate));

  if (!matchesDate) {
    return true;
  }

  if (!hasSelectedValue(selectedCourseValues, group.course)) {
    return true;
  }

  return false;
}

export function shouldHideFeedGroup({
  group,
  joinedGroups,
  blockedUsers,
  showFullFilter,
  selectedDateRange,
  selectedCourseValues,
}: FeedGroupFilterInput) {
  const isFull = group.participantDetails.length >= group.totalSeats;
  const isParticipant = joinedGroups?.includes(group.id);

  if (hasBlockedParticipant(group, blockedUsers)) {
    return true;
  }

  if (isFull && !showFullFilter && !isParticipant) {
    return true;
  }

  return shouldHideBySharedFilters({
    group,
    selectedDateRange,
    selectedCourseValues,
  });
}
