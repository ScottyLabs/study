"use client";
import type { StudyGroup } from "~/types";
import React, { useState } from "react";
import { useUser } from "~/lib/auth-client";
import {
  GroupDetailsOverlay,
  GroupResults,
  GroupWorkspace,
} from "~/features/groups/components/GroupResults";
import { useGroupFilters } from "~/features/groups/hooks/useGroupFilters";
import { useStudyGroups } from "~/features/groups/hooks/useStudyGroups";
import { useUserGroupState } from "~/features/groups/hooks/useUserGroupState";
import { shouldHideBySharedFilters } from "~/features/groups/utils/groupFilters";
import { CalendarCheck } from "lucide-react";

function MyGroupsHeader({ joinedCount }: { joinedCount: number }) {
  return (
    <section className="workspace-header">
      <div>
        <h1 className="workspace-title">My Groups</h1>
        <p className="workspace-subtitle">Keep track of the sessions you have joined.</p>
      </div>
      <div className="workspace-actions">
        <div className="workspace-stat">
          <div className="workspace-stat-value">{joinedCount}</div>
          <div className="workspace-stat-label">Joined</div>
        </div>
      </div>
    </section>
  );
}

const emptyState = (
  <div className="app-empty">
    <CalendarCheck className="h-6 w-6 text-black/35 dark:text-white/35" />
    <p>No joined groups found</p>
    <p className="max-w-sm text-xs font-normal">
      Try changing the filters or join a group from the finder.
    </p>
  </div>
);

export default function MyGroupsPage() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const groups = useStudyGroups(Boolean(user));
  const filters = useGroupFilters(userId);
  const { joinedGroups, setJoinedGroups } = useUserGroupState(userId);
  const [showDetails, setShowDetails] = useState<StudyGroup | null>(null);

  const visibleGroups = groups.filter(
    (group) =>
      joinedGroups?.includes(group.id) === true &&
      filters.matchesSearch(group) &&
      !shouldHideBySharedFilters({
        group,
        selectedDateRange: filters.selectedDateRange,
        selectedCourseValues: filters.selectedCourseValues,
      }),
  );

  return (
    <GroupWorkspace
      filterBarProps={filters.filterBarProps}
      header={<MyGroupsHeader joinedCount={joinedGroups?.length ?? 0} />}
    >
      <GroupResults
        groups={visibleGroups}
        detailsOpen={showDetails !== null}
        isInGroup={() => true}
        isSelected={() => true}
        onSelect={setShowDetails}
        empty={emptyState}
      />
      {showDetails && (
        <GroupDetailsOverlay
          group={showDetails}
          onClose={() => {
            setShowDetails(null);
          }}
          updateJoinedGroups={setJoinedGroups}
        />
      )}
    </GroupWorkspace>
  );
}
