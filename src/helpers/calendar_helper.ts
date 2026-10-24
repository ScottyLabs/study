import { apiRequest, ApiRequestError } from "~/lib/api/client";

type CalendarDate = Date | { toDate: () => Date; toMillis: () => number };
type ConnectionStatus = { configured: boolean; connected: boolean };
const CALENDAR_API = "/api/v1/calendar";

let configured = false;
let initialized = false;
let connected = false;
let setupPromise: Promise<void> | null = null;
let authorizationPromise: Promise<void> | null = null;

export function isCalendarApiReady(): boolean {
  return configured;
}

export function hasCalendarAccess(): boolean {
  return connected;
}

export async function setupGoogleApi(): Promise<void> {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    try {
      sessionStorage.removeItem("google_calendar_token_v1");
    } catch {
      // Storage may be unavailable in private browsing.
    }
    const status = await apiRequest<ConnectionStatus>(
      `${CALENDAR_API}/status`,
      { cache: "no-store" },
    );
    configured = status.configured;
    connected = status.connected;
    initialized = true;
  })().finally(() => {
    setupPromise = null;
  });
  return setupPromise;
}

export function requestCalendarAccess(): Promise<void> {
  return requestCalendarAccessInteractive();
}

/** Open synchronously in the click handler so the browser permits the popup. */
export function requestCalendarAccessInteractive({
  forceRefresh = false,
}: { forceRefresh?: boolean } = {}): Promise<void> {
  if (authorizationPromise) return authorizationPromise;
  if (initialized && !configured) return Promise.resolve();
  if (connected && !forceRefresh) return Promise.resolve();
  const popup = window.open(
    "about:blank",
    "_blank",
    "popup,width=520,height=680",
  );
  if (!popup)
    return Promise.reject(
      new Error("Calendar popup blocked. Allow popups and retry."),
    );
  // Google must not be able to navigate the original preview through window.opener.
  popup.opener = null;
  connected = false;

  authorizationPromise = (async () => {
    const deadline = Date.now() + 5 * 60_000;
    const { attemptId, authorizationUrl } = await apiRequest<{
      attemptId: string;
      authorizationUrl: string;
    }>(`${CALENDAR_API}/authorize`, { method: "POST" });
    if (popup.closed) throw new Error("Calendar connection cancelled");
    popup.location.href = authorizationUrl;
    while (Date.now() < deadline) {
      const attempt = await apiRequest<{ status: string }>(
        `${CALENDAR_API}/attempts/${encodeURIComponent(attemptId)}`,
        { cache: "no-store" },
      );
      if (attempt.status === "success") {
        await setupGoogleApi();
        if (!connected)
          throw new Error("Calendar connection could not be confirmed");
        return;
      }
      if (!["pending", "processing"].includes(attempt.status)) {
        throw new Error("Calendar connection did not complete. Please retry.");
      }
      // Cross-origin opener policies can report a live Google popup as closed.
      // Trust closure only while its same-origin location is still readable.
      if (popup.closed) {
        try {
          const location = popup.location.href;
          if (
            location === "about:blank" ||
            new URL(location).origin === window.location.origin
          ) {
            throw new Error("Calendar connection cancelled");
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "Calendar connection cancelled"
          )
            throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("Calendar connection timed out. Please retry.");
  })().finally(() => {
    authorizationPromise = null;
    try {
      popup.close();
    } catch {
      /* Google may have detached the popup. */
    }
  });
  return authorizationPromise;
}

async function calendarRequest<T>(path: string, init: RequestInit): Promise<T> {
  if (initialized && !configured)
    throw new Error("Calendar integration is not configured");
  try {
    return await apiRequest<T>(`${CALENDAR_API}/events${path}`, init);
  } catch (error) {
    if (error instanceof ApiRequestError && [401, 409].includes(error.status))
      connected = false;
    throw error;
  }
}

/** Adds a one-hour event to the connected user's primary calendar. */
export async function addToCal(
  title: string,
  course: string,
  purpose: string,
  date: CalendarDate,
  location: string,
  details: string,
  email: string,
) {
  const start = date instanceof Date ? date : date.toDate();
  const event = {
    summary: `Study Group: ${title}`,
    location,
    description: `Course: ${course}\nPurpose: ${purpose}\nDetails: ${details}`,
    start: { dateTime: start.toISOString(), timeZone: "America/New_York" },
    end: {
      dateTime: new Date(start.getTime() + 3600000).toISOString(),
      timeZone: "America/New_York",
    },
    attendees: [{ email }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 1440 },
        { method: "popup", minutes: 10 },
      ],
    },
  };
  try {
    const response = await calendarRequest<{ id?: string }>("", {
      method: "POST",
      body: JSON.stringify(event),
    });
    return response.id ?? "None";
  } catch (error) {
    console.warn("Could not create Calendar event", error);
    return "None";
  }
}

export async function deleteFromCal(eventId: string): Promise<boolean> {
  if (!eventId || eventId === "None") return false;
  try {
    await calendarRequest(`/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.warn("Could not delete Calendar event", error);
    return false;
  }
}

export async function updateEvent(
  eventId: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  if (!eventId || eventId === "None") return null;
  try {
    return await calendarRequest(`/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.warn("Could not update Calendar event", error);
    return null;
  }
}
