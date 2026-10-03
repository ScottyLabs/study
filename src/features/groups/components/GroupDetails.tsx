"use client";
import React, { useState, useEffect, useRef } from "react";
import type { StudyGroup } from "~/types";
import {
  setIsEditGroupModalOpen,
  setIsViewProfileOpen,
} from "~/lib/features/uiSlice";
import { useUser } from "~/lib/auth-client";
import CreateProfilePopUp from "~/features/profile/components/CreateProfilePopUp";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { formatDateTime } from "~/helpers/date_helper";
import EditGroupModal from "./EditGroupModal";
import {
  addToCal,
  deleteFromCal,
  requestCalendarAccessInteractive,
  setupGoogleApi,
} from "~/helpers/calendar_helper";
import { GroupDetailsHeader } from "./GroupDetailsHeader";
import { JoinGroupButton } from "./JoinGroupButton";
import { ParticipantList } from "./ParticipantList";
import {
  joinGroup as joinGroupApi,
  leaveGroup as leaveGroupApi,
} from "../services/groupApi";
import { useLiveGroupDetails } from "../hooks/useLiveGroupDetails";
interface Props {
  onClick: () => void;
  details: StudyGroup;
  updateJoinedGroups: React.Dispatch<React.SetStateAction<string[] | null>>;
}
import { usePostHog } from "posthog-js/react";

const GroupDetails = ({ onClick, details, updateJoinedGroups }: Props) => {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  const [participantsState, participantsSetState] = useState(true);
  const {
    currentDetails,
    isJoined: joinedState,
    setIsJoined: joinedSetState,
    eventId: eventIdState,
    isDeleted,
  } = useLiveGroupDetails(details, userEmail);
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [viewEmail, setViewEmail] = useState<string | null>(null);

  const dispatch = useDispatch();
  const posthog = usePostHog();

  const handleViewProfileClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setViewUser(event.currentTarget.getAttribute("data-username"));
    setViewEmail(event.currentTarget.getAttribute("data-email"));
    dispatch(setIsViewProfileOpen(true));
  };

  useEffect(() => {
    setupGoogleApi().catch((err) => {
      console.warn("Failed to initialize Google API:", err);
    });
  }, []);

  useEffect(() => {
    if (!isDeleted) return;
    toast.error("Group unavailable");
    onClick();
  }, [isDeleted, onClick]);

  /* Dynamic size for the info popup */
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<string | undefined>(undefined);
  useEffect(() => {
    const updateHeight = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const top = rect.top; // distance from top of viewport
      const available = window.innerHeight - top - 20; // 20px from bottom
      setMaxHeight(`${available}px`);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("scroll", updateHeight, { passive: true });

    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("scroll", updateHeight);
    };
  }, []);

  const joinGroup = async () => {
    const calendarAuthPromise = requestCalendarAccessInteractive().catch((err) => {
      console.warn("Calendar auth failed:", err);
    });
    const userId = user?.emailAddresses[0]?.emailAddress;
    let eventId: string | undefined = undefined;
    if (!joinedState) {
      if (
        currentDetails.participantDetails.length >= currentDetails.totalSeats
      ) {
        toast.error("Group unavailable");
        return;
      }
      if (!userId) {
        toast.error("Group unavailable");
        return;
      }

      if (!details.id) {
        return;
      }
      // add group to calendar
      await calendarAuthPromise;
      eventId =
        (await addToCal(
          currentDetails.title,
          currentDetails.course,
          currentDetails.purpose,
          currentDetails.startTime,
          currentDetails.location,
          currentDetails.details,
          userId,
        )) ?? "None";

      // update group with new participant
      const newParticipant = {
        name: user?.fullName || "User",
        url: user?.imageUrl ?? null,
        email: user?.emailAddresses[0]?.emailAddress ?? userId,
        eventId,
      };
      try {
        await joinGroupApi({
          groupId: details.id,
          participant: newParticipant,
        });
      } catch (error) {
        console.error(error);
        if (eventId && eventId !== "None") {
          await deleteFromCal(eventId);
        }
        toast.error("Could not join group");
        return;
      }
      toast.success("Joined group");
      posthog.capture("group_joined", { group: currentDetails });

      joinedSetState(!joinedState);
      updateJoinedGroups((prev) => {
        if (!prev) return null;
        return prev.concat(currentDetails.id);
      });
    }
    if (joinedState) {
      if (!details.id) {
        return;
      }
      const userEmail = user?.emailAddresses[0]?.emailAddress ?? userId;
      if (!userId || !userEmail) {
        toast.error("Group unavailable");
        return;
      }
      const participant = currentDetails.participantDetails.find(
        (participantDetail) => participantDetail.email === userEmail,
      );
      const eventIdToDelete = participant?.eventId ?? eventIdState;
      await leaveGroupApi(details.id);
      toast.success("Left group");
      joinedSetState(!joinedState);
      updateJoinedGroups((prev) => {
        if (!prev) return null;
        return prev.filter((item) => item !== currentDetails.id);
      });
      posthog.capture("group_left", { group: currentDetails });

      await calendarAuthPromise;

      if (eventIdToDelete && eventIdToDelete !== "None") {
        const calendarDeleted = await deleteFromCal(eventIdToDelete);
        if (!calendarDeleted) {
          toast(
            "You left the group, but its calendar event could not be removed. Remove it from Google Calendar or retry later.",
            {
              icon: "⚠️",
              style: {
                borderRadius: "10px",
                background: "#333",
                color: "#fff",
              },
            },
          );
        }
      } else {
        toast.error("Could not delete from calendar", {
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        });
      }

      const onlyMember = currentDetails.participantDetails.length <= 1;
      if (onlyMember) {
        onClick();
        posthog.capture("group_emptied", { group: currentDetails });
      }
    }
  };

  if (!currentDetails) return null;
  const [formattedDate, formattedTime] = formatDateTime(
    currentDetails.startTime,
  );
  const canEditGroup =
    joinedState && currentDetails.participantDetails.length === 1;

  return (
    <div ref={cardRef} style={{ maxHeight }} className="group-details-card">
      <GroupDetailsHeader
        title={currentDetails.title}
        canEdit={canEditGroup}
        onEdit={() => dispatch(setIsEditGroupModalOpen(true))}
        onClose={onClick}
      />

      <div id="group_info_popup_body" className="pb-20">
        <p className="group-details-text">
          <strong>Course:</strong> {currentDetails.course}
        </p>
        <p className="group-details-text">
          <strong>Purpose</strong>: {currentDetails.purpose}
        </p>
        <p className="group-details-text">
          <strong>Time</strong>: {formattedTime}
        </p>
        <p className="group-details-text">
          <strong>Date</strong>: {formattedDate}
        </p>
        <p className="group-details-text">
          <strong>Location:</strong> {currentDetails.location}
        </p>
        <p className="group-details-text">
          <strong>Participants:</strong>{" "}
          {currentDetails.participantDetails.length} /{" "}
          {currentDetails.totalSeats}{" "}
          <button
            onClick={() => participantsSetState(!participantsState)}
            className="text-[12px]"
          >
            {participantsState ? "▼" : "▲"}
          </button>
        </p>

        {participantsState && (
          <ParticipantList
            participants={currentDetails.participantDetails}
            onViewProfile={handleViewProfileClick}
          />
        )}

        <strong className="group-details-text">Details:</strong>
        <div className="group-details-freeform">
          {currentDetails.details
            ? currentDetails.details
            : "Hope you have a good time!"}
        </div>

        {viewUser && (
          <CreateProfilePopUp username={viewUser} email={viewEmail ?? ""} />
        )}
      </div>

      <JoinGroupButton isJoined={joinedState} onClick={joinGroup} />
      <EditGroupModal group={currentDetails} />
    </div>
  );
};

export default GroupDetails;
