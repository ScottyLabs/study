"use client";
import { useDispatch } from "react-redux";
import { useAppSelector } from "~/lib/hooks";
import { setIsEditGroupModalOpen } from "~/lib/features/uiSlice";
import React from "react";
import toast from "react-hot-toast";
import { useUser } from "~/lib/auth-client";
import { toastStyle } from "~/lib/toast-style";
import { usePostHog } from "posthog-js/react";
import type { StudyGroup } from "~/types";
import { GroupModalFrame } from "./GroupModalFrame";
import { GroupModalFields } from "./GroupModalFields";
import { useUserCourses } from "~/features/profile/hooks/useUserCourses";
import { updateGroup, type GroupFormInput } from "../services/groupApi";
import { groupFormValues, useGoogleApiSetup, useGroupForm } from "../hooks/useGroupForm";
import {
  updateEvent,
  requestCalendarAccessInteractive,
  hasCalendarAccess,
} from "~/helpers/calendar_helper";

interface EditGroupModalProps {
  group: StudyGroup | null;
}

function calendarEvent({ title, course, purpose, date, location, details }: GroupFormInput) {
  const end = new Date(date.getTime() + 3600000);
  return {
    summary: `Study Group: ${title}`,
    location,
    description: `Course: ${course}\nPurpose: ${purpose}\nDetails: ${details}`,
    start: { dateTime: date.toISOString(), timeZone: "America/New_York" },
    end: { dateTime: end.toISOString(), timeZone: "America/New_York" },
  };
}

// Resolve to whether the group saved but its calendar event did not update
async function saveGroupEdit(group: StudyGroup, input: GroupFormInput, userEmail?: string) {
  const calendarAuthPromise = hasCalendarAccess()
    ? null
    : requestCalendarAccessInteractive().catch((err: unknown) => {
        console.warn("Calendar auth failed:", err);
      });
  await updateGroup({ group, input });
  if (calendarAuthPromise) await calendarAuthPromise;
  const participant = group.participantDetails.find((p) => p.email === userEmail);
  const eventId = participant?.eventId ?? participant?.event ?? "None";
  const calendarUpdate = await updateEvent(eventId, calendarEvent(input));
  return eventId !== "None" && calendarUpdate === null;
}

function captureEdited(
  posthog: ReturnType<typeof usePostHog>,
  group: StudyGroup,
  input: GroupFormInput,
) {
  posthog.capture("group_edited", {
    group: {
      id: group.id,
      title: input.title,
      course: input.course,
      purpose: input.purpose,
      startTime: input.date,
      location: input.location,
      totalSeats: Number(input.seats),
      participantDetails: group.participantDetails,
      details: input.details,
    },
  });
}

type EditGroupFormProps = {
  group: StudyGroup;
  classes: string[];
  userEmail?: string;
  onSaved: () => void;
};

function EditGroupForm({ group, classes, userEmail, onSaved }: EditGroupFormProps) {
  const form = useGroupForm(groupFormValues(group));
  const posthog = usePostHog();

  const submit = () => {
    const { date } = form.values;
    if (!date) {
      toast.error("Invalid Date Input!");
      return;
    }
    const input = { ...form.values, date };
    void saveGroupEdit(group, input, userEmail).then((calendarSyncFailed) => {
      onSaved();
      toast(
        calendarSyncFailed
          ? "Study group saved, but the calendar event was not updated. Reopen Edit to retry."
          : "Study group edited successfully!",
        { icon: "👏", style: toastStyle },
      );
      captureEdited(posthog, group, input);
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <GroupModalFields
        values={form.values}
        onChange={form.update}
        classes={classes}
        titleMaxLength={27}
        locationMaxLength={40}
      />
      <button type="submit" className="modal-submit-button">
        Edit Group
      </button>
    </form>
  );
}

export default function EditGroupModal({ group }: EditGroupModalProps) {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  const { classes } = useUserCourses(userEmail);
  const dispatch = useDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEditGroupModalOpen);
  useGoogleApiSetup(isOpen);

  const handleClose = () => {
    dispatch(setIsEditGroupModalOpen(false));
  };

  if (!isOpen || !group) return null;

  return (
    <GroupModalFrame id="editGroupPopUp" title="Edit Study Group" onClose={handleClose}>
      {/* Mount per open so the fields start from the group's current values */}
      <EditGroupForm
        key={group.id}
        group={group}
        classes={classes.map((userCourse) => userCourse.courseID)}
        userEmail={userEmail}
        onSaved={handleClose}
      />
    </GroupModalFrame>
  );
}
