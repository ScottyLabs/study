"use client";
import { useDispatch } from "react-redux";
import { useAppSelector } from "~/lib/hooks";
import { setIsEditGroupModalOpen } from "~/lib/features/uiSlice";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useUser } from "~/lib/auth-client";
import { usePostHog } from "posthog-js/react";
import type { StudyGroup } from "~/types";
import { GroupModalFrame } from "./GroupModalFrame";
import { GroupModalFields } from "./GroupModalFields";
import { useUserCourses } from "~/features/profile/hooks/useUserCourses";
import { updateGroup } from "../services/groupApi";
import {
  updateEvent,
  setupGoogleApi,
  requestCalendarAccessInteractive,
  hasCalendarAccess,
} from "~/helpers/calendar_helper";

interface EditGroupModalProps {
  group: StudyGroup | null;
}

export default function EditGroupModal({ group }: EditGroupModalProps) {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState<Date | null>();
  const [location, setLocation] = useState("");
  const [seats, setSeats] = useState("");
  const [details, setDetails] = useState("");
  const { classes } = useUserCourses(userId);
  const classOptions = classes.map((course) => course.courseID);

  const dispatch = useDispatch();
  const isOpen = useAppSelector((state) => state.ui.isEditGroupModalOpen);
  const posthog = usePostHog();

  const handleClose = () => {
    dispatch(setIsEditGroupModalOpen(false));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!group) return;
    if (!date) {
      toast.error("Invalid Date Input!");
      return;
    }

    let calendarAuthPromise: Promise<void> | null = null;
    if (!hasCalendarAccess()) {
      calendarAuthPromise = requestCalendarAccessInteractive().catch((err) => {
        console.warn("Calendar auth failed:", err);
      });
    }
    const updatedGroup = await updateGroup({
      group,
      input: {
        title,
        course,
        purpose,
        date,
        location,
        seats,
        details,
      },
    });
    if (calendarAuthPromise) {
      await calendarAuthPromise;
    }
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    const participant = group.participantDetails?.find(
      (p) => p.email === userEmail,
    );
    const eventId = participant?.eventId ?? participant?.event ?? "None";
    const start = date.toISOString();
    const end = new Date(date.getTime() + 3600000).toISOString();
    const calendarUpdate = await updateEvent(eventId, {
      summary: `Study Group: ${title}`,
      location,
      description: `Course: ${course}\nPurpose: ${purpose}\nDetails: ${details}`,
      start: { dateTime: start, timeZone: "America/New_York" },
      end: { dateTime: end, timeZone: "America/New_York" },
    });

    const calendarSyncFailed = eventId !== "None" && calendarUpdate === null;

    setTitle("");
    setCourse("");
    setPurpose("");
    setDate(null);
    setLocation("");
    setSeats("");
    setDetails("");
    handleClose();

    toast(
      calendarSyncFailed
        ? "Study group saved, but the calendar event was not updated. Reopen Edit to retry."
        : "Study group edited successfully!",
      {
        icon: "👏",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      },
    );
    posthog.capture("group_edited", {
      group: {
        id: group.id,
        title,
        course,
        purpose,
        startTime: date,
        location,
        totalSeats: Number(seats),
        participantDetails: group.participantDetails,
        details,
      },
    });
  };

  useEffect(() => {
    if (!isOpen || !group) return;
    setTitle(group.title || "");
    setCourse(group.course || "");
    setPurpose(group.purpose || "");
    setDate(group.startTime ?? null);
    setLocation(group.location || "");
    setSeats(group.totalSeats ? String(group.totalSeats) : "");
    setDetails(group.details || "");
  }, [isOpen, group]);

  useEffect(() => {
    if (!isOpen) return;
    void setupGoogleApi().catch((err) => {
      console.error("Failed to initialize Google API:", err);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <GroupModalFrame
      id="editGroupPopUp"
      title="Edit Study Group"
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        <GroupModalFields
          title={title}
          setTitle={setTitle}
          titleMaxLength={27}
          course={course}
          setCourse={setCourse}
          classes={classOptions}
          purpose={purpose}
          setPurpose={setPurpose}
          date={date}
          setDate={setDate}
          location={location}
          setLocation={setLocation}
          locationMaxLength={40}
          seats={seats}
          setSeats={setSeats}
          details={details}
          setDetails={setDetails}
        />
        <button type="submit" className="modal-submit-button">
          Edit Group
        </button>
      </form>
    </GroupModalFrame>
  );
}
