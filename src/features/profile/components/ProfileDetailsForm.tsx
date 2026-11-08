"use client";

import { useMemo, useState } from "react";
import { useProfileDetails } from "../hooks/useProfileDetails";

type ProfileDetailsFormProps = {
  userId?: string;
  compact?: boolean;
  mastersValue?: string;
};

type ClassYearSelectProps = {
  value: string;
  onChange: (year: string) => void;
  className: string;
  mastersValue: string;
};

function ClassYearSelect({ value, onChange, className, mastersValue }: ClassYearSelectProps) {
  const [startYear] = useState(() => new Date().getFullYear());
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, index) => String(startYear + index)),
    [startYear],
  );
  return (
    <select
      id="yearSelect"
      name="yearSelect"
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className={className}
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
  );
}

export function ProfileDetailsForm(props: ProfileDetailsFormProps) {
  const { userId, compact = false, mastersValue = "Masters Student" } = props;
  const { profileDetails, updateProfileDetails } = useProfileDetails(userId);
  const inputClassName = compact ? "profile-input-compact" : "profile-input";

  return (
    <div className="profile-details-form">
      <label htmlFor="yearSelect">
        <span>Class year</span>
        <ClassYearSelect
          value={profileDetails.year}
          onChange={(year) => {
            void updateProfileDetails({ year });
          }}
          className={compact ? "profile-select-compact" : "profile-select"}
          mastersValue={mastersValue}
        />
      </label>
      <label>
        <span>Major</span>
        <input
          id="majorInput"
          className={inputClassName}
          type="text"
          value={profileDetails.majors}
          onChange={(event) => {
            void updateProfileDetails({ majors: event.target.value });
          }}
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
          onChange={(event) => {
            void updateProfileDetails({ minors: event.target.value });
          }}
          placeholder="Optional"
        />
      </label>
    </div>
  );
}
