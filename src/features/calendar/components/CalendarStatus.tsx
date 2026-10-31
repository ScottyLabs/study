"use client";

import { useEffect, useState } from "react";

import {
  hasCalendarAccess,
  isCalendarApiReady,
  requestCalendarAccessInteractive,
  setupGoogleApi,
} from "~/helpers/calendar_helper";

type Status = "loading" | "unavailable" | "connected" | "disconnected";

function currentStatus(): Status {
  if (!isCalendarApiReady()) return "unavailable";
  return hasCalendarAccess() ? "connected" : "disconnected";
}

export function CalendarStatus() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setupGoogleApi()
      .then(() => setStatus(currentStatus()))
      .catch(() => setError("Google Calendar status unavailable"));
  }, []);

  // Called directly from the click so iOS browsers allow the popup.
  function connect() {
    setError(null);
    requestCalendarAccessInteractive()
      .then(() => setStatus(currentStatus()))
      .catch((connectError: unknown) =>
        setError(
          connectError instanceof Error
            ? connectError.message
            : "Calendar connection failed. Please retry.",
        ),
      );
  }

  if (status === "loading" || status === "unavailable")
    return error ? <p className="calendar-status">{error}</p> : null;

  return (
    <p className="calendar-status">
      Google Calendar:{" "}
      {status === "connected" ? (
        "Connected"
      ) : (
        <>
          Not connected ·{" "}
          <button type="button" onClick={connect}>
            Connect
          </button>
        </>
      )}
      {error && <span> {error}</span>}
    </p>
  );
}
