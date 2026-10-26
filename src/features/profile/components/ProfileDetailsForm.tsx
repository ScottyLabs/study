"use client";

import { useMemo } from "react";
import { useProfileDetails } from "../hooks/useProfileDetails";

type ProfileDetailsFormProps = {
  userId?: string;
  compact?: boolean;
  mastersValue?: string;
};

export function ProfileDetailsForm({
  userId,
  compact = false,
  mastersValue = "Masters Student",
}: ProfileDetailsFormProps) {
  const { profileDetails, updateProfileDetails } = useProfileDetails(userId);
  const startYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, index) => String(startYear + index)),
    [startYear],
  );
  const selectClassName = compact ? "profile-select-compact" : "profile-select";
  const inputClassName = compact ? "profile-input-compact" : "profile-input";

  return (
    <div className="profile-details-form">
      <label>
        <span>Class year</span>
        <select
          id="yearSelect"
          name="yearSelect"
          value={profileDetails.year}
          onChange={(event) =>
            updateProfileDetails({ year: event.target.value })
          }
          className={selectClassName}
        >
          <option disabled value="default">
            Select Year
          </option>
          {years.map((year) => (
            <option key={year} value={year}>
              Class of {year}
            </option>
          ))}
          <option value={mastersValue}>Masters Student</option>
          <option value="PhD Student">PhD Student</option>
        </select>
      </label>
      <label>
        <span>Major</span>
        <input
          id="majorInput"
          className={inputClassName}
          type="text"
          value={profileDetails.majors}
          onChange={(event) =>
            updateProfileDetails({ majors: event.target.value })
          }
          placeholder="Information Systems"
          required
        />
      </label>
      <label>
        <span>Minor</span>
        <input
          id="minorInput"
          className={inputClassName}
          type="text"
          value={profileDetails.minors}
          onChange={(event) =>
            updateProfileDetails({ minors: event.target.value })
          }
          placeholder="Optional"
        />
      </label>
    </div>
  );
}
