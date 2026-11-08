"use client";
import type { StudyGroup } from "~/types";
import React, { useState } from "react";
import { useUser } from "~/lib/auth-client";
import { useDispatch } from "react-redux";
import { setIsCreateGroupModalOpen } from "~/lib/features/uiSlice";
import { usePostHog } from "posthog-js/react";

import {
  GroupDetailsOverlay,
  GroupResults,
  GroupWorkspace,
} from "~/features/groups/components/GroupResults";
import { useGroupFilters } from "~/features/groups/hooks/useGroupFilters";
import { useStudyGroups } from "~/features/groups/hooks/useStudyGroups";
import { useUserGroupState } from "~/features/groups/hooks/useUserGroupState";
import { shouldHideFeedGroup } from "~/features/groups/utils/groupFilters";
import { Plus, Search } from "lucide-react";

type GroupFinderProps = {
  initialGroup?: StudyGroup;
  onCloseInitialGroup?: () => void;
  onInitialGroupUnavailable?: () => void;
};

function GroupFinderHeader({ available, joined }: { available: number; joined: number }) {
  const dispatch = useDispatch();
  return (
    <section className="workspace-header">
      <div>
        <h1 className="workspace-title">Group Finder</h1>
        <p className="workspace-subtitle">
          Find an upcoming study session that fits your course and schedule.
        </p>
      </div>
      <div className="workspace-actions">
        <div className="workspace-stat">
          <div className="workspace-stat-value">{available}</div>
          <div className="workspace-stat-label">Available</div>
        </div>
        <div className="workspace-stat">
          <div className="workspace-stat-value">{joined}</div>
          <div className="workspace-stat-label">Joined</div>
        </div>
        <button
          aria-label="New group"
          className="button-primary"
          onClick={() => {
            dispatch(setIsCreateGroupModalOpen(true));
          }}
          type="button"
        >
          <Plus aria-hidden="true" className="nav-link-icon" />
          <span className="hidden desktop:inline">New group</span>
        </button>
      </div>
    </section>
  );
}

const emptyState = (
  <div className="app-empty">
    <Search className="h-6 w-6 text-black/35 dark:text-white/35" />
    <p>No groups found</p>
  </div>
);

function visibleFeedGroups(
  groups: StudyGroup[],
  filters: ReturnType<typeof useGroupFilters>,
  {
    joinedGroups,
    blockedUsers,
  }: Pick<ReturnType<typeof useUserGroupState>, "joinedGroups" | "blockedUsers">,
) {
  return groups.filter(
    (group) =>
      filters.matchesSearch(group) &&
      !shouldHideFeedGroup({
        group,
        joinedGroups,
        blockedUsers,
        showFullFilter: false,
        selectedDateRange: filters.selectedDateRange,
        selectedCourseValues: filters.selectedCourseValues,
      }),
  );
}

export function GroupFinder(props: GroupFinderProps) {
  const { initialGroup, onCloseInitialGroup, onInitialGroupUnavailable } = props;
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const groups = useStudyGroups(Boolean(user));
  const filters = useGroupFilters(userId);
  const groupState = useUserGroupState(userId);
  const { joinedGroups, setJoinedGroups } = groupState;
  const [showDetails, setShowDetails] = useState<StudyGroup | null>(initialGroup ?? null);
  const posthog = usePostHog();

  const visibleGroups = visibleFeedGroups(groups, filters, groupState);
  const header = (
    <GroupFinderHeader available={visibleGroups.length} joined={joinedGroups?.length ?? 0} />
  );

  return (
    <GroupWorkspace filterBarProps={filters.filterBarProps} header={header}>
      <GroupResults
        groups={visibleGroups}
        detailsOpen={showDetails !== null}
        isInGroup={(group) => joinedGroups?.includes(group.id) === true}
        isSelected={(group) => group.id === showDetails?.id}
        onSelect={(group) => {
          setShowDetails(group);
          posthog.capture("group_clicked", { group: group });
        }}
        empty={emptyState}
      />
      {showDetails && (
        <GroupDetailsOverlay
          group={showDetails}
          onClose={() => {
            setShowDetails(null);
            onCloseInitialGroup?.();
          }}
          onUnavailable={
            showDetails.id === initialGroup?.id ? onInitialGroupUnavailable : undefined
          }
          updateJoinedGroups={setJoinedGroups}
        />
      )}
    </GroupWorkspace>
  );
}
