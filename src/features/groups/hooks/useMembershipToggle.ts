"use client";
import type { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";
import { usePostHog } from "posthog-js/react";

import type { StudyGroup } from "~/types";
import { useUser } from "~/lib/auth-client";
import { isInThePast } from "~/helpers/date_helper";
import {
  addToCal,
  deleteFromCal,
  requestCalendarAccessInteractive,
} from "~/helpers/calendar_helper";
import { joinGroup, leaveGroup } from "../services/groupApi";

const toastStyle = {
  borderRadius: "10px",
  background: "var(--color-toast-background)",
  color: "var(--color-toast-text)",
};

type Member = { email: string; name: string; imageUrl: string | null };

async function joinWithCalendar(group: StudyGroup, member: Member, calendarAuth: Promise<void>) {
  await calendarAuth;
  const eventId =
    (await addToCal(
      group.title,
      group.course,
      group.purpose,
      group.startTime,
      group.location,
      group.details,
      member.email,
    )) ?? "None";
  try {
    await joinGroup({
      groupId: group.id,
      participant: { name: member.name, url: member.imageUrl, email: member.email, eventId },
    });
  } catch (error) {
    console.error(error);
    if (eventId !== "" && eventId !== "None") await deleteFromCal(eventId);
    toast.error("Could not join group");
    return false;
  }
  toast.success("Joined group");
  return true;
}

async function removeCalendarEvent(eventId: string | undefined, calendarAuth: Promise<void>) {
  await calendarAuth;
  if (eventId === undefined || eventId === "" || eventId === "None") {
    toast.error("Could not delete from calendar", { style: toastStyle });
    return;
  }
  if (!(await deleteFromCal(eventId))) {
    toast(
      "You left the group, but its calendar event could not be removed. Remove it from Google Calendar or retry later.",
      { icon: "⚠️", style: toastStyle },
    );
  }
}

type Options = {
  group: StudyGroup;
  isJoined: boolean;
  setIsJoined: (joined: boolean) => void;
  eventId: string;
  updateJoinedGroups: Dispatch<SetStateAction<string[] | null>>;
  onEmptied: () => void;
};

export function useMembershipToggle(options: Options) {
  const { group, isJoined, setIsJoined, eventId, updateJoinedGroups, onEmptied } = options;
  const { user } = useUser();
  const posthog = usePostHog();

  const join = async (email: string, calendarAuth: Promise<void>) => {
    const fullName = user?.fullName ?? "";
    const name = fullName === "" ? "User" : fullName;
    const member = { email, name, imageUrl: user?.imageUrl ?? null };
    if (!(await joinWithCalendar(group, member, calendarAuth))) return;
    posthog.capture("group_joined", { group });
    setIsJoined(true);
    updateJoinedGroups((previous) => previous?.concat(group.id) ?? null);
  };

  const leave = async (email: string, calendarAuth: Promise<void>) => {
    const participant = group.participantDetails.find((detail) => detail.email === email);
    await leaveGroup(group.id);
    toast.success("Left group");
    setIsJoined(false);
    updateJoinedGroups((previous) => previous?.filter((item) => item !== group.id) ?? null);
    posthog.capture("group_left", { group });
    await removeCalendarEvent(participant?.eventId ?? eventId, calendarAuth);
    if (group.participantDetails.length <= 1) {
      onEmptied();
      posthog.capture("group_emptied", { group });
    }
  };

  return async () => {
    const full = group.participantDetails.length >= group.totalSeats;
    if (!isJoined && (isInThePast(group.startTime) || full)) return;
    // Open the popup before any await so the browser treats it as part of the click
    const calendarAuth = requestCalendarAccessInteractive().catch((error: unknown) => {
      console.warn("Calendar auth failed:", error);
    });
    const email = user?.emailAddresses[0]?.emailAddress ?? "";
    if (group.id === "") return;
    if (email === "") {
      toast.error("Group unavailable");
      return;
    }
    await (isJoined ? leave(email, calendarAuth) : join(email, calendarAuth));
  };
}
