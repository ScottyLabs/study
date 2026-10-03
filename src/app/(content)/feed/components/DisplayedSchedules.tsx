"use client";

import Card from "~/features/groups/components/Card";
import { formatDateTime } from "~/helpers/date_helper";
import { StudyGroup } from "~/types";

export default function DisplayedSchedule({
  group,
  joinedGroups,
  selectedGroup,
  handleCardClick
}: {
  group: StudyGroup[];
  joinedGroups: string[] | null;
  selectedGroup: string | null;
  handleCardClick: (group: StudyGroup) => void
}) {
  return (
    <>
      {group.map((group) => {
        const [formattedDate, formattedTime] = formatDateTime(group.startTime);
        const isInGroup = joinedGroups
          ? joinedGroups.includes(group.id)
          : false;
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
      })}
    </>
  );
}
