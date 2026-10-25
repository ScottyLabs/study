import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { StudyGroup } from "~/types";

interface Props {
  group: StudyGroup;
  time: string | null;
  date: string | null;
  isInGroup: boolean;
  selected: boolean;
}

export default function CardSkeleton({
  title,
  purpose,
  num
}: {
  title: string;
  purpose: string;
  num: number;
}) {
  return (
    <div className="app-loading">
      <div className="study-card-header">
        <span className="study-card-course !text-transparent">15122</span>
      </div>

      <div className="study-card-copy">
        <h2 className="study-card-title study-card-loading">{title}</h2>
        <p className="study-card-purpose study-card-loading-sub">
          {purpose}
        </p>
      </div>

      <div className="study-card-meta">
        <div className="study-card-row">
          <CalendarDays className="study-card-icon opacity-30" />
          <span className="study-card-value">
            <strong className="study-card-loading">Location</strong>
            <small className="study-card-loading-sub">timeaaaaa</small>
          </span>
        </div>
        <div className="study-card-row">
          <MapPin className="study-card-icon opacity-30" />
          <span className="study-card-value">
            <strong className="study-card-loading">Location</strong>
            <small className="study-card-loading-sub">group.location</small>
          </span>
        </div>
      </div>

      <div className="study-card-footer">
        <div className="study-card-participants">
          <div
            className="participant-stack text-transparent"
            aria-hidden="true"
          >
            {Array.from(Array(num)).map((i, j) => (
              <div className="avatar-small participant-overflow !text-transparent">
                1
              </div>
            ))}
          </div>
          <span className="study-card-loading">
            {23} of {512}
          </span>
        </div>
        <span className="study-card-open bg-lightAccent !text-transparent dark:bg-darkAccent">
          Details <ArrowUpRight size={16} />
        </span>
      </div>
    </div>
  );
}
