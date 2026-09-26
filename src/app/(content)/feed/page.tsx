"use client";
import GroupDetails from "~/features/groups/components/GroupDetails";
import type { StudyGroup } from "~/types";
import React, { useState } from "react";
import { useUser } from "~/lib/auth-client";
import { formatDateTime } from "~/helpers/date_helper";
import type { MultiValue } from "react-select";
import TopFilterBar from "~/features/groups/components/FilterBar";
import { useDispatch } from "react-redux";
import { setIsCreateGroupModalOpen } from "~/lib/features/uiSlice";
import { usePostHog } from "posthog-js/react";

import Card from "~/features/groups/components/Card";
import { groupCardColors } from "~/features/groups/constants";
import { useStudyGroups } from "~/features/groups/hooks/useStudyGroups";
import { useUserGroupState } from "~/features/groups/hooks/useUserGroupState";
import { shouldHideFeedGroup } from "~/features/groups/utils/groupFilters";
import { useUserCourses } from "~/features/profile/hooks/useUserCourses";
import { Plus, Search } from "lucide-react";

export default function FeedPage() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const groups = useStudyGroups(Boolean(user));
  const { classes: userClasses } = useUserCourses(userId);
  const classOptions = userClasses.map((course) => ({
    value: course.courseID,
    label: course.courseID,
  }));
  const { joinedGroups, setJoinedGroups, blockedUsers } =
    useUserGroupState(userId);
  const [selectedCourses, setSelectedCourses] = useState<
    MultiValue<{ value: string; label: string }>
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<StudyGroup | null>(null);
  const showFullFilter = false;
  const dispatch = useDispatch();
  const posthog = usePostHog();

  const handleCardClick = (group: StudyGroup) => {
    setSelectedGroup(group.id);
    setShowDetails(group);
    posthog.capture("group_clicked", { group: group });
  };

  const closeDetailsPopUp = () => {
    setShowDetails(null);
    setSelectedGroup(null);
  };

  const handleCreateGroup = () => {
    dispatch(setIsCreateGroupModalOpen(true));
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleGroups = groups.filter((group) => {
    const matchesSearch =
      !normalizedSearch ||
      [group.course, group.title, group.purpose, group.location].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    return (
      matchesSearch &&
      !shouldHideFeedGroup({
        group,
        joinedGroups,
        blockedUsers,
        showFullFilter,
        selectedDate,
        selectedCourseValues: selectedCourses.map((course) => course.value),
      })
    );
  });
  const joinedCount = joinedGroups?.length ?? 0;

  const displayScheduled = visibleGroups.map((group) => {
    const [formattedDate, formattedTime] = formatDateTime(group.startTime);
    const isInGroup = joinedGroups ? joinedGroups.includes(group.id) : false;
    const selected = group.id === selectedGroup;

    return (
      <Card
        key={group.id}
        onClick={() => handleCardClick(group)}
        group={group}
        time={formattedTime}
        date={formattedDate}
        isInGroup={isInGroup}
        selected={selected}
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
              <h1 className="workspace-title">Group Finder</h1>
              <p className="workspace-subtitle">
                Find an upcoming study session that fits your course and
                schedule.
              </p>
            </div>
            <div className="workspace-actions">
              <div className="workspace-stat">
                <div className="workspace-stat-value">
                  {visibleGroups.length}
                </div>
                <div className="workspace-stat-label">Available</div>
              </div>
              <div className="workspace-stat">
                <div className="workspace-stat-value">{joinedCount}</div>
                <div className="workspace-stat-label">Joined</div>
              </div>
              <button
                className="button-primary"
                onClick={handleCreateGroup}
                type="button"
              >
                <Plus className="nav-link-icon" />
                New group
              </button>
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
                    <Search className="h-6 w-6 text-black/35 dark:text-white/35" />
                    <p>No groups found</p>
                  </div>
                )}
              </div>
            </div>

            {showDetails && (
              <div
                className="details-overlay workspace-detail"
                onClick={(e) =>
                  e.target === e.currentTarget && closeDetailsPopUp()
                }
              >
                <div
                  className="details-overlay-inner"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GroupDetails
                    details={showDetails}
                    onClick={() => closeDetailsPopUp()}
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
