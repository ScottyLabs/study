"use client";
import { useState } from "react";
import type { MultiValue } from "react-select";

import type { DateFilterRange, StudyGroup } from "~/types";
import { useUserCourses } from "~/features/profile/hooks/useUserCourses";
import type { FilterOption, TopFilterBarProps } from "../components/FilterBar";

export function useGroupFilters(userId: string | undefined) {
  const { classes } = useUserCourses(userId);
  const [selectedCourses, setSelectedCourses] = useState<MultiValue<FilterOption>>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateFilterRange>([null, null]);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filterBarProps: TopFilterBarProps = {
    courseOptions: classes.map((course) => ({ value: course.courseID, label: course.courseID })),
    selectedCourses,
    setSelectedCourses,
    selectedDateRange,
    setSelectedDateRange,
    searchQuery,
    setSearchQuery,
  };

  return {
    filterBarProps,
    selectedDateRange,
    selectedCourseValues: selectedCourses.map((course) => course.value),
    matchesSearch: (group: StudyGroup) =>
      normalizedSearch === "" ||
      [group.course, group.title, group.purpose, group.location].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
  };
}
