"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DatePickerInput } from "~/components/ui/DatePickerInput";
import type { GroupFormValues } from "../hooks/useGroupForm";

type GroupModalFieldsProps = {
  values: GroupFormValues;
  onChange: (patch: Partial<GroupFormValues>) => void;
  classes: string[];
  titleMaxLength: number;
  locationMaxLength: number;
};

function GroupBasicsFields({ values, onChange, classes, titleMaxLength }: GroupModalFieldsProps) {
  return (
    <>
      <input
        className="form-control-accent"
        type="text"
        aria-label="Group title"
        placeholder="Title"
        value={values.title}
        onChange={(event) => {
          onChange({ title: event.target.value });
        }}
        required
        maxLength={titleMaxLength}
      />
      <select
        className="form-control"
        id="classSelect"
        aria-label="Course"
        value={values.course}
        onChange={(event) => {
          onChange({ course: event.target.value });
        }}
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
      <input
        className="form-control"
        type="text"
        aria-label="Purpose"
        placeholder="Purpose"
        value={values.purpose}
        onChange={(event) => {
          onChange({ purpose: event.target.value });
        }}
        required
        maxLength={50}
      />
    </>
  );
}

function GroupDateField({ values, onChange }: GroupModalFieldsProps) {
  return (
    <DatePicker
      selected={values.date}
      onChange={(date) => {
        onChange({ date });
      }}
      ariaLabelledBy="Date and time"
      showTimeSelect
      dateFormat="Pp"
      placeholderText="Date/Time"
      popperClassName="custom-popper"
      customInput={<DatePickerInput />}
      wrapperClassName="w-full"
      className="w-full"
      required
    />
  );
}

function GroupLogisticsFields(props: GroupModalFieldsProps) {
  const { values, onChange, locationMaxLength } = props;
  return (
    <>
      <GroupDateField {...props} />
      <input
        className="form-control"
        type="text"
        aria-label="Location"
        placeholder="Location"
        value={values.location}
        onChange={(event) => {
          onChange({ location: event.target.value });
        }}
        required
        maxLength={locationMaxLength}
      />
      <input
        className="form-control"
        type="number"
        aria-label="Maximum seats"
        placeholder="Max Seats"
        value={values.seats}
        onChange={(event) => {
          onChange({ seats: event.target.value });
        }}
        required
        min="2"
        max="100"
      />
      <input
        className="form-control"
        type="text"
        aria-label="Details"
        placeholder="Details"
        value={values.details}
        maxLength={200}
        onChange={(event) => {
          onChange({ details: event.target.value });
        }}
      />
    </>
  );
}

export function GroupModalFields(props: GroupModalFieldsProps) {
  return (
    <>
      <GroupBasicsFields {...props} />
      <GroupLogisticsFields {...props} />
    </>
  );
}
