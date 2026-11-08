import type { StudyGroup } from "~/types";
import { apiRequest } from "~/lib/api/client";

export const GROUPS_CHANGED_EVENT = "study-groups-changed";
const GROUPS_CHANNEL_NAME = "study-groups";
let groupsChannel: BroadcastChannel | null = null;

function getGroupsChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }

  groupsChannel ??= new BroadcastChannel(GROUPS_CHANNEL_NAME);
  return groupsChannel;
}

export function notifyGroupsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
    getGroupsChannel()?.postMessage({ type: GROUPS_CHANGED_EVENT });
  }
}

export function subscribeToGroupChanges(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleMessage = () => {
    listener();
  };
  const channel = getGroupsChannel();
  window.addEventListener(GROUPS_CHANGED_EVENT, listener);
  channel?.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener(GROUPS_CHANGED_EVENT, listener);
    channel?.removeEventListener("message", handleMessage);
  };
}

export type GroupParticipant = {
  name: string;
  url: string | null;
  email: string;
  eventId?: string;
  event?: string;
};

export type GroupFormInput = {
  title: string;
  course: string;
  purpose: string;
  date: Date;
  location: string;
  seats: string;
  details: string;
};

type ApiGroup = {
  id: string;
  courseCode: string;
  title: string;
  purpose: string;
  details: string;
  location: string;
  startTime: string;
  totalSeats: number;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    url: string | null;
    eventId: string | null;
  }>;
};

function toStudyGroup(group: ApiGroup): StudyGroup {
  return {
    id: group.id,
    course: group.courseCode,
    title: group.title,
    purpose: group.purpose,
    details: group.details,
    location: group.location,
    startTime: new Date(group.startTime),
    totalSeats: group.totalSeats,
    participantDetails: group.participants.map((participant) => ({
      name: participant.name,
      url: participant.url,
      email: participant.email,
      eventId: participant.eventId ?? undefined,
    })),
  };
}

export async function fetchGroups(courseCode?: string) {
  const query =
    courseCode === undefined || courseCode === ""
      ? ""
      : `?courseCode=${encodeURIComponent(courseCode)}`;
  const response = await apiRequest<{ groups: ApiGroup[] }>(`/api/v1/groups${query}`, {
    cache: "no-store",
  });

  return response.groups.map(toStudyGroup);
}

export async function fetchGroup(groupId: string) {
  const response = await apiRequest<{ group: ApiGroup }>(
    `/api/v1/groups/${encodeURIComponent(groupId)}`,
    { cache: "no-store" },
  );

  return toStudyGroup(response.group);
}

export async function createGroup({
  input,
  participant,
}: {
  input: GroupFormInput;
  participant: GroupParticipant;
}) {
  const response = await apiRequest<{ group: ApiGroup }>("/api/v1/groups", {
    method: "POST",
    body: JSON.stringify({
      courseCode: input.course,
      title: input.title,
      purpose: input.purpose,
      details: input.details,
      location: input.location,
      startTime: input.date.toISOString(),
      totalSeats: Number(input.seats),
      calendarEventId: participant.eventId,
    }),
  });

  const group = toStudyGroup(response.group);

  notifyGroupsChanged();

  return group;
}

export async function joinGroup({
  groupId,
  participant,
}: {
  groupId: string;
  participant: GroupParticipant;
}) {
  await apiRequest(`/api/v1/groups/${encodeURIComponent(groupId)}/join`, {
    method: "POST",
    body: JSON.stringify({ calendarEventId: participant.eventId }),
  });

  notifyGroupsChanged();
}

export async function updateGroup({ group, input }: { group: StudyGroup; input: GroupFormInput }) {
  const response = await apiRequest<{ group: ApiGroup }>(
    `/api/v1/groups/${encodeURIComponent(group.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        courseCode: input.course,
        title: input.title,
        purpose: input.purpose,
        details: input.details,
        location: input.location,
        startTime: input.date.toISOString(),
        totalSeats: Number(input.seats),
      }),
    },
  );

  const updatedGroup = toStudyGroup(response.group);
  notifyGroupsChanged();

  return updatedGroup;
}

export async function leaveGroup(groupId: string) {
  await apiRequest(`/api/v1/groups/${encodeURIComponent(groupId)}/join`, {
    method: "DELETE",
  });

  notifyGroupsChanged();
}
