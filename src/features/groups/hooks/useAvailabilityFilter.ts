"use client";

import { useEffect, useState } from "react";
import {
  fetchBusyIntervals,
  isCalendarApiReady,
  requestCalendarAccessInteractive,
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
    return "Reconnect Google Calendar";
  return error instanceof Error
    ? error.message
    : "Availability is unavailable. Please retry.";
}

/** Turns the filter on, connecting Google Calendar first if needed. */
export function useAvailabilityFilter(groups: StudyGroup[]) {
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Load the connection state early, so a click can decide without waiting.
  useEffect(() => {
    setupGoogleApi().catch((err) => {
      console.warn("Failed to load Google Calendar status:", err);
    });
  }, []);

  async function setEnabled(enabled: boolean) {
    setStatus(null);
    if (!enabled) {
      setBusyIntervals(null);
      return;
    }
    setLoading(true);
    try {
      // Nothing is awaited before this call: iPhone browsers only allow a popup
      // opened directly in the click. It resolves at once when already connected.
      await requestCalendarAccessInteractive();
      if (!isCalendarApiReady()) {
        setStatus("Google Calendar is unavailable");
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
