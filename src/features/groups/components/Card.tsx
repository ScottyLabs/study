"use client";

import type { StudyGroup } from "~/types";
import { ArrowUpRight, CalendarDays, Check, MapPin } from "lucide-react";
import { AvatarImage } from "~/components/ui/UserAvatar";

interface Props {
  onClick: (g: StudyGroup) => void;
  group: StudyGroup;
  time: string | null;
  date: string | null;
  isInGroup: boolean;
  selected: boolean;
}

const Card = ({
  onClick,
  group,
  time,
  date,
  isInGroup,
  selected
}: Props) => {
  const visibleParticipants = group.participantDetails.slice(0, 4);
  const remainingParticipants = Math.max(
    group.participantDetails.length - visibleParticipants.length,
    0,
  );

  return (
    <button
      type="button"
      className={`study-card ${selected ? "study-card-accent" : "study-card-sidebar"}`}
      onClick={() => onClick(group)}
    >
      <div className="study-card-header">
        <span className="study-card-course">{group.course}</span>
        {isInGroup && (
          <span className="study-card-joined">
            <Check size={14} /> Joined
          </span>
        )}
      </div>

      <div className="study-card-copy">
        <h2 className="study-card-title">{group.title}</h2>
        <p className="study-card-purpose">{group.purpose}</p>
      </div>

      <div className="study-card-meta">
        <div className="study-card-row">
          <CalendarDays className="study-card-icon" />
          <span className="study-card-value">
            <strong>{date}</strong>
            <small>{time}</small>
          </span>
        </div>
        <div className="study-card-row">
          <MapPin className="study-card-icon" />
          <span className="study-card-value">
            <strong>Location</strong>
            <small>{group.location}</small>
          </span>
        </div>
      </div>

      <div className="study-card-footer">
        <div className="study-card-participants">
          <div className="participant-stack" aria-hidden="true">
            {visibleParticipants.map((participant) => (
              <AvatarImage
                key={participant.email}
                src={participant.url}
                alt=""
                fallbackText={participant.name}
              />
            ))}
            {remainingParticipants > 0 && (
              <span className="participant-overflow">
                +{remainingParticipants}
              </span>
            )}
          </div>
          <span>
            {group.participantDetails.length} of {group.totalSeats}
          </span>
        </div>
        <span className="study-card-open">
          Details <ArrowUpRight size={16} />
        </span>
      </div>
    </button>
  );
};

export default Card;
