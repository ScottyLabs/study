import { ArrowUpRight, CalendarDays, Check, MapPin } from "lucide-react";
import { AvatarImage } from "~/components/ui/UserAvatar";

export default async function LoadingCard() {
  return (
    <button
      type="button"
      className={`study-card "study-card-accent"`}
    >
      <div className="study-card-header">
        <span className="study-card-course">"group.course"</span>
        <span className="study-card-joined">
        <Check   size={14} /> Joined
        </span>
      </div>

      <div className="study-card-copy">
        <h2 className="study-card-title">"group.title"</h2>
        <p className="study-card-purpose">group.purpose</p>
      </div>

      <div className="study-card-meta">
        <div className="study-card-row">
          <CalendarDays className="study-card-icon" />
          <span className="study-card-value">
            <strong>date</strong>
            <small>time</small>
          </span>
        </div>
        <div className="study-card-row">
          <MapPin className="study-card-icon" />
          <span className="study-card-value">
            <strong>Location</strong>
            <small>group.location</small>
          </span>
        </div>
      </div>

      <div className="study-card-footer">
        <div className="study-card-participants">
          <div className="participant-stack" aria-hidden="true">
            {["1,2,3"].map((participant) => (
              <AvatarImage
                key={participant}
                src={participant}
                alt=""
                fallbackText={participant}
              />
            ))}
                <span className="participant-overflow">
                +5
                </span>
          </div>
          <span>
            group.participantDetails.length of group.totalSeats
          </span>
        </div>
        <span className="study-card-open">
          Details <ArrowUpRight size={16} />
        </span>
      </div>
    </button>
  );
};