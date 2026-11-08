"use client";

import { forwardRef } from "react";

type DatePickerInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const DatePickerInput = forwardRef<HTMLInputElement, DatePickerInputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} readOnly className={`form-control block ${className ?? ""}`} {...props} />
  ),
);

DatePickerInput.displayName = "DatePickerInput";
