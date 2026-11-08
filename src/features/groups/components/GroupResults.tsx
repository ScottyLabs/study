"use client";
import type React from "react";

import type { StudyGroup } from "~/types";
import { formatDateTime } from "~/helpers/date_helper";
import Card from "./Card";
import GroupDetails from "./GroupDetails";
import TopFilterBar, { type TopFilterBarProps } from "./FilterBar";

type GroupWorkspaceProps = {
  filterBarProps: TopFilterBarProps;
  header: React.ReactNode;
  children: React.ReactNode;
};

export function GroupWorkspace({ filterBarProps, header, children }: GroupWorkspaceProps) {
  return (
    <>
      <TopFilterBar {...filterBarProps} />
      <main className="content-page">
        <div className="workspace-page">
          {header}
          <div className="workspace-layout">{children}</div>
        </div>
      </main>
    </>
  );
}

type GroupResultsProps = {
  groups: StudyGroup[];
  detailsOpen: boolean;
  isInGroup: (group: StudyGroup) => boolean;
  isSelected: (group: StudyGroup) => boolean;
  onSelect: (group: StudyGroup) => void;
  empty: React.ReactNode;
};

export function GroupResults(props: GroupResultsProps) {
  const { groups, detailsOpen, isInGroup, isSelected, onSelect, empty } = props;
  return (
    <div className={`workspace-results ${detailsOpen ? "" : "desktop:col-span-2"}`}>
      <div className={detailsOpen ? "group-grid" : "group-grid-wide"}>
        {groups.map((group) => {
          const [formattedDate, formattedTime] = formatDateTime(group.startTime);
          return (
            <Card
              key={group.id}
              onClick={onSelect}
              group={group}
              time={formattedTime}
              date={formattedDate}
              isInGroup={isInGroup(group)}
              selected={isSelected(group)}
            />
          );
        })}
        {groups.length === 0 && empty}
      </div>
    </div>
  );
}

type GroupDetailsOverlayProps = {
  group: StudyGroup;
  onClose: () => void;
  onUnavailable?: () => void;
  updateJoinedGroups: React.Dispatch<React.SetStateAction<string[] | null>>;
};

export function GroupDetailsOverlay({
  group,
  onClose,
  onUnavailable,
  updateJoinedGroups,
}: GroupDetailsOverlayProps) {
  return (
    <div
      className="details-overlay workspace-detail"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="details-overlay-inner">
        <GroupDetails
          details={group}
          onClick={onClose}
          onUnavailable={onUnavailable}
          updateJoinedGroups={updateJoinedGroups}
        />
      </div>
    </div>
  );
}
