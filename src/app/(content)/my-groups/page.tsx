"use client";
import GroupDetails from "~/features/groups/components/GroupDetails";
import type { StudyGroup } from "~/types";
import React, { useState } from "react";
import { useUser } from "~/lib/auth-client";
import { formatDateTime } from "~/helpers/date_helper";
import type { MultiValue } from "react-select";
import TopFilterBar from "~/features/groups/components/FilterBar";
import Card from "~/features/groups/components/Card";
import { useStudyGroups } from "~/features/groups/hooks/useStudyGroups";
import { useUserGroupState } from "~/features/groups/hooks/useUserGroupState";
import { shouldHideBySharedFilters } from "~/features/groups/utils/groupFilters";
import { useUserCourses } from "~/features/profile/hooks/useUserCourses";
import { CalendarCheck } from "lucide-react";

export default function MyGroupsPage() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const groups = useStudyGroups(Boolean(user));
  const { classes: userClasses } = useUserCourses(userId);
  const classOptions = userClasses.map((course) => ({
    value: course.courseID,
    label: course.courseID,
  }));
  const { joinedGroups, setJoinedGroups } = useUserGroupState(userId);
  const [selectedCourses, setSelectedCourses] = useState<
    MultiValue<{ value: string; label: string }>
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetails, setShowDetails] = useState<StudyGroup | null>(null);

  const visibleGroups = groups.filter((group) => {
    const isParticipant = joinedGroups?.includes(group.id);
    if (!isParticipant) return false;
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      [group.course, group.title, group.purpose, group.location].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    return (
      matchesSearch &&
      !shouldHideBySharedFilters({
        group,
        selectedDate,
        selectedCourseValues: selectedCourses.map((course) => course.value),
      })
    );
  });

  const displayScheduled = visibleGroups.map((group) => {
    const [formattedDate, formattedTime] = formatDateTime(group.startTime);
    return (
      <Card
        key={group.id}
        onClick={() => setShowDetails(group)}
        group={group}
        time={formattedTime}
        date={formattedDate}
        isInGroup={true}
        selected
      />
    );
  });

  return (
    <>
      <TopFilterBar
        courseOptions={classOptions}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="content-page">
        <div className="workspace-page">
          <section className="workspace-header">
            <div>
              <h1 className="workspace-title">My Groups</h1>
              <p className="workspace-subtitle">
                Keep track of the sessions you have joined.
              </p>
            </div>
            <div className="workspace-actions">
              <div className="workspace-stat">
                <div className="workspace-stat-value">
                  {visibleGroups.length}
                </div>
                <div className="workspace-stat-label">Showing</div>
              </div>
              <div className="workspace-stat">
                <div className="workspace-stat-value">
                  {joinedGroups?.length ?? 0}
                </div>
                <div className="workspace-stat-label">Joined</div>
              </div>
            </div>
          </section>

          <div className="workspace-layout">
            <div
              className={`workspace-results ${showDetails ? "" : "xl:col-span-2"}`}
            >
              <div
                className={`${showDetails ? "group-grid" : "group-grid-wide"}`}
              >
                {displayScheduled}
                {visibleGroups.length === 0 && (
                  <div className="app-empty">
                    <CalendarCheck className="h-6 w-6 text-black/35 dark:text-white/35" />
                    <p>No joined groups found</p>
                    <p className="max-w-sm text-xs font-normal">
                      Try changing the filters or join a group from the finder.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {showDetails && (
              <div
                className="details-overlay workspace-detail"
                onClick={(e) =>
                  e.target === e.currentTarget && setShowDetails(null)
                }
              >
                <div
                  className="details-overlay-inner"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GroupDetails
                    details={showDetails}
                    onClick={() => setShowDetails(null)}
                    updateJoinedGroups={setJoinedGroups}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
