"use client";
import React, { useState, useEffect } from "react";
import type { StudyGroup } from "~/types";
import { setIsEditGroupModalOpen, setIsViewProfileOpen } from "~/lib/features/uiSlice";
import { useUser } from "~/lib/auth-client";
import CreateProfilePopUp from "~/features/profile/components/CreateProfilePopUp";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { MOBILE_LAYOUT_QUERY } from "~/lib/responsive";
import { GroupShareAction } from "./GroupShareAction";
import { formatDateTime, isInThePast } from "~/helpers/date_helper";
import EditGroupModal from "./EditGroupModal";
import { setupGoogleApi } from "~/helpers/calendar_helper";
import { GroupDetailsHeader } from "./GroupDetailsHeader";
import { JoinGroupButton } from "./JoinGroupButton";
import { ParticipantList } from "./ParticipantList";
import { useLiveGroupDetails } from "../hooks/useLiveGroupDetails";
import { useMembershipToggle } from "../hooks/useMembershipToggle";
import { CalendarDays, ChevronDown, ChevronUp, Clock3, MapPin, Users } from "lucide-react";
interface Props {
  onClick: () => void;
  onUnavailable?: () => void;
  details: StudyGroup;
  updateJoinedGroups: React.Dispatch<React.SetStateAction<string[] | null>>;
}

function useGroupDetailsEffects(isDeleted: boolean, onUnavailable: () => void) {
  useEffect(() => {
    setupGoogleApi().catch((err: unknown) => {
      console.warn("Failed to initialize Google API:", err);
    });
  }, []);

  useEffect(() => {
    if (!isDeleted) return;
    toast.error("Group unavailable");
    onUnavailable();
  }, [isDeleted, onUnavailable]);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const previousOverflow = document.body.style.overflow;
    const syncScrollLock = () => {
      document.body.style.overflow = media.matches ? "hidden" : previousOverflow;
    };
    syncScrollLock();
    media.addEventListener("change", syncScrollLock);
    return () => {
      media.removeEventListener("change", syncScrollLock);
      document.body.style.overflow = previousOverflow;
    };
  }, []);
}

function GroupDetailsInfo({ group }: { group: StudyGroup }) {
  const [formattedDate, formattedTime] = formatDateTime(group.startTime);
  return (
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
      <p className="group-details-text col-span-2">
        <MapPin className="group-details-info-icon" />
        <span>
          <span className="group-details-label">Location</span>
          <span className="group-details-value">{group.location}</span>
        </span>
      </p>
    </div>
  );
}

type ParticipantsSectionProps = {
  group: StudyGroup;
  onViewProfile: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

function ParticipantsSection({ group, onViewProfile }: ParticipantsSectionProps) {
  const [participantsState, participantsSetState] = useState(true);
  return (
    <section className="group-details-section">
      <div className="group-details-section-heading">
        <span>
          <Users size={17} /> Participants
        </span>
        <div>
          <span className="group-details-count">
            {group.participantDetails.length} / {group.totalSeats}
          </span>
          <button
            onClick={() => {
              participantsSetState(!participantsState);
            }}
            className="participants-toggle"
            aria-expanded={participantsState}
            aria-label={participantsState ? "Hide participants" : "Show participants"}
          >
            {participantsState ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
        </div>
      </div>
      {participantsState && (
        <ParticipantList participants={group.participantDetails} onViewProfile={onViewProfile} />
      )}
    </section>
  );
}

function GroupDetailsBody({ group }: { group: StudyGroup }) {
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [viewEmail, setViewEmail] = useState<string | null>(null);
  const dispatch = useDispatch();

  const handleViewProfileClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setViewUser(event.currentTarget.dataset.username ?? null);
    setViewEmail(event.currentTarget.dataset.email ?? null);
    dispatch(setIsViewProfileOpen(true));
  };

  return (
    <div id="group_info_popup_body" className="group-details-body">
      <GroupDetailsInfo group={group} />
      <ParticipantsSection group={group} onViewProfile={handleViewProfileClick} />
      <section className="group-details-section">
        <div className="group-details-section-heading">
          <span>About this group</span>
        </div>
        <div className="group-details-freeform">
          {group.details ? group.details : "Hope you have a good time!"}
        </div>
      </section>
      {viewUser !== null && viewUser !== "" && (
        <CreateProfilePopUp username={viewUser} email={viewEmail ?? ""} />
      )}
    </div>
  );
}

const GroupDetails = ({ onClick, onUnavailable, details, updateJoinedGroups }: Props) => {
  const { user } = useUser();
  const live = useLiveGroupDetails(details, user?.emailAddresses[0]?.emailAddress);
  const { currentDetails, isJoined } = live;
  const toggleMembership = useMembershipToggle({
    group: currentDetails,
    isJoined,
    setIsJoined: live.setIsJoined,
    eventId: live.eventId,
    updateJoinedGroups,
    onEmptied: onClick,
  });
  const dispatch = useDispatch();
  useGroupDetailsEffects(live.isDeleted, onUnavailable ?? onClick);

  const ended = isInThePast(currentDetails.startTime);
  const full = currentDetails.participantDetails.length >= currentDetails.totalSeats;
  const canEditGroup = isJoined && currentDetails.participantDetails.length === 1;

  return (
    <dialog open className="group-details-card" aria-label={`${currentDetails.title} details`}>
      <div className="group-details-scroll">
        <GroupDetailsHeader
          title={currentDetails.title}
          course={currentDetails.course}
          purpose={currentDetails.purpose}
          canEdit={canEditGroup}
          onEdit={() => {
            dispatch(setIsEditGroupModalOpen(true));
          }}
          onClose={onClick}
        />
        <GroupDetailsBody group={currentDetails} />
        <div className="group-details-footer">
          <GroupShareAction group={currentDetails} />
          <JoinGroupButton
            isJoined={isJoined}
            onClick={() => {
              void toggleMembership();
            }}
            disabled={!isJoined && (ended || full)}
            unavailableLabel={ended ? "Session ended" : "Group full"}
          />
        </div>
      </div>
      <EditGroupModal group={currentDetails} />
    </dialog>
  );
};

export default GroupDetails;
