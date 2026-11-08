"use client";
import { useEffect, useState } from "react";

import type { StudyGroup } from "~/types";
import { setupGoogleApi } from "~/helpers/calendar_helper";

export type GroupFormValues = {
  title: string;
  course: string;
  purpose: string;
  date: Date | null;
  location: string;
  seats: string;
  details: string;
};

const emptyGroupForm: GroupFormValues = {
  title: "",
  course: "",
  purpose: "",
  date: null,
  location: "",
  seats: "",
  details: "",
};

export function groupFormValues(group: StudyGroup): GroupFormValues {
  return {
    title: group.title,
    course: group.course,
    purpose: group.purpose,
    date: group.startTime,
    location: group.location,
    seats: group.totalSeats === 0 ? "" : String(group.totalSeats),
    details: group.details,
  };
}

export function useGroupForm(initial: GroupFormValues = emptyGroupForm) {
  const [values, setValues] = useState(initial);
  return {
    values,
    update: (patch: Partial<GroupFormValues>) => {
      setValues((current) => ({ ...current, ...patch }));
    },
    reset: () => {
      setValues(emptyGroupForm);
    },
  };
}

export function useGoogleApiSetup(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    setupGoogleApi().catch((err: unknown) => {
      console.error("Failed to initialize Google API:", err);
    });
  }, [enabled]);
}
