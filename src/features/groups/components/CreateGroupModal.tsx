"use client";
import { useDispatch } from "react-redux";
import { useAppSelector } from "~/lib/hooks";
import { setIsCreateGroupModalOpen } from "~/lib/features/uiSlice";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useUser } from "~/lib/auth-client";
import { toastStyle } from "~/lib/toast-style";
import { usePostHog } from "posthog-js/react";
import {
  addToCal,
  requestCalendarAccessInteractive,
  deleteFromCal,
} from "~/helpers/calendar_helper";
import { GroupModalFrame } from "./GroupModalFrame";
import { GroupModalFields } from "./GroupModalFields";
import { useUserCourses } from "~/features/profile/hooks/useUserCourses";
import { createGroup, type GroupFormInput } from "../services/groupApi";
import { useGoogleApiSetup, useGroupForm, type GroupFormValues } from "../hooks/useGroupForm";
import type { StudyGroup } from "~/types";
import { GroupShareAction } from "./GroupShareAction";
import { LoaderCircle } from "lucide-react";

type Member = { name: string; url: string | null; email: string };

async function createWithCalendar(input: GroupFormInput, member: Member) {
  let eventId = "None";
  try {
    await requestCalendarAccessInteractive().catch((err: unknown) => {
      console.warn("Calendar auth failed:", err);
    });
    const { title, course, purpose, date, location, details } = input;
    eventId =
      (await addToCal(title, course, purpose, date, location, details, member.email)) ?? "None";
    return await createGroup({ input, participant: { ...member, eventId } });
  } catch (error) {
    console.error(error);
    if (eventId !== "None") {
      await deleteFromCal(eventId).catch((err: unknown) => {
        console.error("Failed to roll back calendar event:", err);
      });
    }
    return null;
  }
}

function captureCreated(
  posthog: ReturnType<typeof usePostHog>,
  group: StudyGroup,
  values: GroupFormValues,
) {
  posthog.capture("group_created", {
    group: {
      id: group.id,
      course: values.course,
      purpose: values.purpose,
      startTime: group.startTime,
      totalSeats: Number(values.seats),
      participantCount: 1,
      hasDetails: values.details !== "",
    },
  });
}

function CreatedGroupView({ group, onClose }: { group: StudyGroup; onClose: () => void }) {
  return (
    <GroupModalFrame key="success" id="group-created" title="Group created!" onClose={onClose}>
      <p>Your study group is ready. Share it with classmates to invite them.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <GroupShareAction
          group={group}
          className="button-primary"
          mobileLabel="Invite classmates"
          desktopLabel="Copy link to study group"
        />
        <button type="button" className="button-outline" onClick={onClose}>
          Done
        </button>
      </div>
    </GroupModalFrame>
  );
}

function useCreateGroup(onCreated: (group: StudyGroup) => void) {
  const { user } = useUser();
  const form = useGroupForm();
  const [busy, setBusy] = useState(false);
  const posthog = usePostHog();

  const submit = () => {
    const { date } = form.values;
    if (!date) {
      toast.error("Invalid Date Input!");
      return;
    }
    const email = user?.emailAddresses[0]?.emailAddress ?? "";
    if (email === "") {
      toast.error("Error creating study group", { style: toastStyle });
      return;
    }
    setBusy(true);
    const fullName = user?.fullName ?? "";
    const member = {
      name: fullName === "" ? "User" : fullName,
      url: user?.imageUrl ?? null,
      email,
    };
    void createWithCalendar({ ...form.values, date }, member).then((group) => {
      setBusy(false);
      if (group === null) {
        toast.error("Error creating study group");
        return;
      }
      captureCreated(posthog, group, form.values);
      onCreated(group);
      form.reset();
      toast("Study group created successfully!", { icon: "👏", style: toastStyle });
    });
  };

  return { form, busy, submit };
}

export default function CreateGroupModal() {
  const [createdGroup, setCreatedGroup] = useState<StudyGroup | null>(null);
  const { user } = useUser();
  const { classes } = useUserCourses(user?.emailAddresses[0]?.emailAddress);
  const { form, busy, submit } = useCreateGroup(setCreatedGroup);
  const dispatch = useDispatch();
  const isOpen = useAppSelector((state) => state.ui.isCreateGroupModalOpen);
  useGoogleApiSetup(isOpen);

  const handleClose = () => {
    setCreatedGroup(null);
    dispatch(setIsCreateGroupModalOpen(false));
  };

  if (!isOpen) return null;
  if (createdGroup) return <CreatedGroupView group={createdGroup} onClose={handleClose} />;

  return (
    <GroupModalFrame id="createGroupPopUp" title="Create New Study Group" onClose={handleClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <GroupModalFields
          values={form.values}
          onChange={form.update}
          classes={classes.map((userCourse) => userCourse.courseID)}
          titleMaxLength={27}
          locationMaxLength={40}
        />
        <button
          type="submit"
          className={`modal-submit-button ${busy ? "opacity-70" : "modal-submit-interactive"}`}
          disabled={busy}
        >
          {busy ? <LoaderCircle className="animate-spin" size={20} /> : "Create Group"}
        </button>
      </form>
    </GroupModalFrame>
  );
}
