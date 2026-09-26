"use client";

import type { Dispatch, SetStateAction } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DatePickerInput } from "~/components/ui/DatePickerInput";

type GroupModalFieldsProps = {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  titleMaxLength: number;
  course: string;
  setCourse: Dispatch<SetStateAction<string>>;
  classes: string[];
  purpose: string;
  setPurpose: Dispatch<SetStateAction<string>>;
  date: Date | null | undefined;
  setDate: Dispatch<SetStateAction<Date | null | undefined>>;
  location: string;
  setLocation: Dispatch<SetStateAction<string>>;
  locationMaxLength: number;
  seats: string;
  setSeats: Dispatch<SetStateAction<string>>;
  details: string;
  setDetails: Dispatch<SetStateAction<string>>;
};

export function GroupModalFields({
  title,
  setTitle,
  titleMaxLength,
  course,
  setCourse,
  classes,
  purpose,
  setPurpose,
  date,
  setDate,
  location,
  setLocation,
  locationMaxLength,
  seats,
  setSeats,
  details,
  setDetails,
}: GroupModalFieldsProps) {
  return (
    <>
      <input
        className="form-control-accent"
        type="text"
        aria-label="Group title"
        placeholder="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        maxLength={titleMaxLength}
      />
      <select
        className="form-control"
        id="classSelect"
        aria-label="Course"
        value={course}
        onChange={(event) => setCourse(event.target.value)}
        required
      >
        <option value="" disabled>
          Select a class
        </option>
        {classes.map((classId) => (
          <option key={classId} value={classId}>
            {classId}
          </option>
        ))}
      </select>
      <select
        className="form-control"
        aria-label="Purpose"
        value={purpose}
        onChange={(event) => setPurpose(event.target.value)}
        required
      >
        <option value="" disabled>
          Select a purpose
        </option>
        <option value="Exam Review">Exam Review</option>
        <option value="Homework">Homework</option>
        <option value="Lecture Review">Lecture Review</option>
        <option value="Miscellaneous">Miscellaneous</option>
      </select>
      <DatePicker
        selected={date}
        onChange={(selectedDate) => setDate(selectedDate)}
        ariaLabelledBy="Date and time"
        showTimeSelect
        dateFormat="Pp"
        placeholderText="Date/Time"
        popperClassName="custom-popper"
        calendarClassName="bg-lightInput dark:bg-darkInput"
        customInput={<DatePickerInput />}
        wrapperClassName="w-full"
        className="w-full"
        required
      />
      <input
        className="form-control"
        type="text"
        aria-label="Location"
        placeholder="Location"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        required
        maxLength={locationMaxLength}
      />
      <input
        className="form-control"
        type="number"
        aria-label="Maximum seats"
        placeholder="Max Seats"
        value={seats}
        onChange={(event) => setSeats(event.target.value)}
        required
        min="2"
        max="100"
      />
      <input
        className="form-control"
        type="text"
        aria-label="Details"
        placeholder="Details"
        value={details}
        maxLength={200}
        onChange={(event) => setDetails(event.target.value)}
      />
    </>
  );
}
