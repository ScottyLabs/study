"use client";

import { useState } from "react";
import {
  fetchBusyIntervals,
  hasCalendarAccess,
  isCalendarApiReady,
  setupGoogleApi,
  type BusyInterval,
} from "~/helpers/calendar_helper";
import { ApiRequestError } from "~/lib/api/client";
import { MAX_BUSY_RANGE_MS } from "~/lib/calendar";
import type { StudyGroup } from "~/types";

const HOUR_MS = 60 * 60_000;

function availabilityRange(groups: StudyGroup[]) {
  const from = new Date();
  const latestEnd = Math.max(
    from.getTime() + HOUR_MS,
    ...groups.map((group) => group.startTime.getTime() + HOUR_MS),
  );
  return {
    from,
    to: new Date(Math.min(latestEnd, from.getTime() + MAX_BUSY_RANGE_MS)),
  };
}

function failureStatus(error: unknown) {
  if (error instanceof ApiRequestError && [401, 409].includes(error.status))
    return "Calendar not connected";
  return error instanceof Error
    ? error.message
    : "Availability is unavailable. Please retry.";
}

/** Loads busy times once each time the user turns the filter on. */
export function useAvailabilityFilter(groups: StudyGroup[]) {
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function setEnabled(enabled: boolean) {
    setStatus(null);
    if (!enabled) {
      setBusyIntervals(null);
      return;
    }
    setLoading(true);
    try {
      await setupGoogleApi();
      if (!isCalendarApiReady()) {
        setStatus("Google Calendar is unavailable");
      } else if (!hasCalendarAccess()) {
        setStatus("Calendar not connected");
      } else {
        const { from, to } = availabilityRange(groups);
        setBusyIntervals(await fetchBusyIntervals(from, to));
      }
    } catch (error) {
      setStatus(failureStatus(error));
    } finally {
      setLoading(false);
    }
  }

  return { busyIntervals, loading, status, setEnabled };
}
