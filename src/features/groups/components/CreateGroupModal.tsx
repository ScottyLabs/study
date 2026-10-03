"use client";
import { useDispatch } from "react-redux";
import { useAppSelector } from "~/lib/hooks";
import { setIsCreateGroupModalOpen } from "~/lib/features/uiSlice";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useUser } from "~/lib/auth-client";
import { usePostHog } from "posthog-js/react";
import {
  addToCal,
  setupGoogleApi,
  isCalendarApiReady,
  requestCalendarAccessInteractive,
  deleteFromCal,
} from "~/helpers/calendar_helper";
import { GroupModalFrame } from "./GroupModalFrame";
import { GroupModalFields } from "./GroupModalFields";
import { useUserCourses } from "~/features/profile/hooks/useUserCourses";
import { createGroup } from "../services/groupApi";
import { LoaderCircle } from "lucide-react";

export default function CreateGroupModal() {
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
  const [disableSubmit, setDisableSubmit] = useState(false);
  const classOptions = classes.map((course) => course.courseID);

  const dispatch = useDispatch();
  const isOpen = useAppSelector((state) => state.ui.isCreateGroupModalOpen);
  const posthog = usePostHog();

  const handleClose = () => {
    dispatch(setIsCreateGroupModalOpen(false));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setDisableSubmit(true);
    if (!date) {
      toast.error("Invalid Date Input!");
      return;
    }

    const userEmail = user?.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      toast("Error creating study group", {
        icon: "❌",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return;
    }

    let group;
    let eventId = "None";
    try {
      if (isCalendarApiReady()) {
        await requestCalendarAccessInteractive().catch((err) => {
          console.warn("Calendar auth failed:", err);
        });
      }

      eventId =
        (await addToCal(
          title,
          course,
          purpose,
          date,
          location,
          details,
          userEmail,
        )) ?? "None";
      const participant = {
        name: user?.fullName || "User",
        url: user?.imageUrl ?? null,
        email: userEmail,
        eventId,
      };

      group = await createGroup({
        input: {
          title,
          course,
          purpose,
          date,
          location,
          seats,
          details,
        },
        participant,
      });
    } catch (error) {
      console.error(error);
      if (eventId !== "None") {
        await deleteFromCal(eventId).catch((err) =>
          console.error("Failed to roll back calendar event:", err),
        );
      }
      setDisableSubmit(false);
      toast.error("Error creating study group");
      return;
    }

    posthog.capture("group_created", {
      group: {
        id: group.id,
        course,
        purpose,
        startTime: group.startTime,
        totalSeats: Number(seats),
        participantCount: 1,
        hasDetails: Boolean(details),
      },
    });

    setTitle("");
    setCourse("");
    setPurpose("");
    setDate(null);
    setLocation("");
    setSeats("");
    setDetails("");
    setDisableSubmit(false);
    handleClose();

    toast("Study group created successfully!", {
      icon: "👏",
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
      },
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    void setupGoogleApi().catch((err) => {
      console.error("Failed to initialize Google API:", err);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <GroupModalFrame
      id="createGroupPopUp"
      title="Create New Study Group"
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
        <button
          type="submit"
          className={`modal-submit-button ${disableSubmit ? "opacity-70":"modal-submit-interactive"}`}
          disabled={disableSubmit}
        >
          {
            disableSubmit ? <LoaderCircle className="animate-spin" size={20}/>
            : "Create Group"
          }
          
        </button>
      </form>
    </GroupModalFrame>
  );
}
