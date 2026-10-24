"use client";
import React, { useState, useEffect } from "react";
import type { StudyGroup } from "~/types";
import {
  setIsEditGroupModalOpen,
  setIsViewProfileOpen,
} from "~/lib/features/uiSlice";
import { useUser } from "~/lib/auth-client";
import CreateProfilePopUp from "~/features/profile/components/CreateProfilePopUp";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { GroupShareAction } from "./GroupShareAction";
import { formatDateTime, isInThePast } from "~/helpers/date_helper";
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
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";
interface Props {
  onClick: () => void;
  onUnavailable?: () => void;
  details: StudyGroup;
  updateJoinedGroups: React.Dispatch<React.SetStateAction<string[] | null>>;
}
import { usePostHog } from "posthog-js/react";

const GroupDetails = ({
  onClick,
  onUnavailable,
  details,
  updateJoinedGroups,
}: Props) => {
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
    (onUnavailable ?? onClick)();
  }, [isDeleted, onClick, onUnavailable]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const joinGroup = async () => {
    if (
      !joinedState &&
      (isInThePast(currentDetails.startTime) ||
        currentDetails.participantDetails.length >= currentDetails.totalSeats)
    )
      return;
    const calendarAuthPromise = requestCalendarAccessInteractive().catch(
      (err) => {
        console.warn("Calendar auth failed:", err);
      },
    );
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
    <div
      className="group-details-card"
      role="dialog"
      aria-label={`${currentDetails.title} details`}
    >
      <GroupDetailsHeader
        title={currentDetails.title}
        course={currentDetails.course}
        purpose={currentDetails.purpose}
        canEdit={canEditGroup}
        onEdit={() => dispatch(setIsEditGroupModalOpen(true))}
        onClose={onClick}
      />

      <div id="group_info_popup_body" className="group-details-body">
        <div className="group-details-list">
          <p className="group-details-text">
            <CalendarDays className="group-details-info-icon" />
            <span>
              <span className="group-details-label">Date</span>
              <span className="group-details-value">{formattedDate}</span>
            </span>
          </p>
          <p className="group-details-text">
            <Clock3 className="group-details-info-icon" />
            <span>
              <span className="group-details-label">Time</span>
              <span className="group-details-value">{formattedTime}</span>
            </span>
          </p>
          <p className="group-details-text">
            <MapPin className="group-details-info-icon" />
            <span>
              <span className="group-details-label">Location</span>
              <span className="group-details-value">
                {currentDetails.location}
              </span>
            </span>
          </p>
        </div>

        <section className="group-details-section">
          <div className="group-details-section-heading">
            <span>
              <Users size={17} /> Participants
            </span>
            <div>
              <span className="group-details-count">
                {currentDetails.participantDetails.length} /{" "}
                {currentDetails.totalSeats}
              </span>
              <button
                onClick={() => participantsSetState(!participantsState)}
                className="participants-toggle"
                aria-expanded={participantsState}
                aria-label={
                  participantsState ? "Hide participants" : "Show participants"
                }
              >
                {participantsState ? (
                  <ChevronUp size={17} />
                ) : (
                  <ChevronDown size={17} />
                )}
              </button>
            </div>
          </div>
          {participantsState && (
            <ParticipantList
              participants={currentDetails.participantDetails}
              onViewProfile={handleViewProfileClick}
            />
          )}
        </section>

        <section className="group-details-section">
          <div className="group-details-section-heading">
            <span>About this group</span>
          </div>
          <div className="group-details-freeform">
            {currentDetails.details
              ? currentDetails.details
              : "Hope you have a good time!"}
          </div>
        </section>

        {viewUser && (
          <CreateProfilePopUp username={viewUser} email={viewEmail ?? ""} />
        )}
      </div>

      <div className="group-details-footer">
        <GroupShareAction group={currentDetails} />
        <JoinGroupButton
          isJoined={joinedState}
          onClick={joinGroup}
          disabled={
            !joinedState &&
            (isInThePast(currentDetails.startTime) ||
              currentDetails.participantDetails.length >=
                currentDetails.totalSeats)
          }
          unavailableLabel={
            isInThePast(currentDetails.startTime)
              ? "Session ended"
              : "Group full"
          }
        />
      </div>
      <EditGroupModal group={currentDetails} />
    </div>
  );
};

export default GroupDetails;
