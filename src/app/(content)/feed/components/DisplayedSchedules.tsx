"use client";

import Card from "~/features/groups/components/Card";
import { StudyGroup } from "~/types";

export async function a() {
  return;
}
export default function DisplayedSchedule({ group }: { group: StudyGroup }) {
  return (
    <Card
      key={group.id}
      onClick={() => handleCardClick(group)}
      group={group}
      time={formattedTime}
      date={formattedDate}
      isInGroup={isInGroup}
      lightColor={cardColors.light}
      darkColor={cardColors.dark}
    />
  );
}
visibleGroups.map((group) => {
  const [formattedDate, formattedTime] = formatDateTime(group.startTime);
  const isInGroup = joinedGroups ? joinedGroups.includes(group.id) : false;
  const cardColors =
    group.id === selectedGroup
      ? groupCardColors.selected
      : groupCardColors.default;
});
