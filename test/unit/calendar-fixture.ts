import { z } from "zod";
import { CALENDAR_SCOPES } from "~/server/calendar/security";
import { startCalendarAuthorization } from "~/server/calendar/service";
import { calendarEnv, calendarStore, googleCalendar } from "../fakes/calendar";
import type { ConnectionRow } from "../fakes/calendar";
import { googleAuth } from "../fakes/google-auth";

export const config = {
  SERVER_URL: "https://study-web-pr-54.scottylabs.net",
  OAUTH_RELAY_URL: "https://relay.scottylabs.net/oauth2/callback",
  CALENDAR_CLIENT_ID: "calendar-client",
  CALENDAR_CLIENT_SECRET: "calendar-secret",
  CALENDAR_TOKEN_ENCRYPTION_KEY: "ab".repeat(32),
};
export const userId = "student-1";
export const sessionId = "session-1";

type Settings = {
  connection?: ConnectionRow | null;
  scopes?: string[];
  googleAccountId?: string;
  exchangeError?: Error;
  refreshError?: Error;
  eventError?: Error;
  env?: Partial<Record<keyof typeof config, string | undefined>>;
};

const relayState = z.looseObject({ return_to: z.string() });

export function fixture(settings: Settings = {}) {
  Object.assign(calendarEnv, config, settings.env);
  Object.assign(googleAuth, {
    redirectUri: config.OAUTH_RELAY_URL,
    tokens: {
      access_token: "google-access",
      refresh_token: "google-refresh",
      expiry_date: Date.now() + 3600_000,
      scope: "",
    },
    scopes: settings.scopes ?? CALENDAR_SCOPES,
    googleAccountId: settings.googleAccountId ?? "google-user-1",
    exchangeError: settings.exchangeError,
    refreshError: settings.refreshError,
    exchanges: 0,
    refreshes: 0,
  });
  Object.assign(googleCalendar, { eventError: settings.eventError, requests: [] });
  calendarStore.attempts = new Map();
  calendarStore.connection = settings.connection ?? null;
}

export function storedAttempt(id: string) {
  const row = calendarStore.attempts.get(id);
  if (!row) throw new Error(`No authorization attempt ${id}`);
  return row;
}

export function storedConnection() {
  if (!calendarStore.connection) throw new Error("No Calendar connection");
  return calendarStore.connection;
}

export async function authorize() {
  const start = await startCalendarAuthorization(userId, sessionId);
  const url = new URL(start.authorizationUrl);
  const params = new URLSearchParams({
    state: url.searchParams.get("state") ?? "",
    code: "authorization-code",
  });
  return { ...start, url, params, attempt: storedAttempt(start.attemptId) };
}

export function readState(state: string | null) {
  return relayState.parse(JSON.parse(Buffer.from(state ?? "", "base64url").toString()));
}

export function googleError(response: { status: number; data?: unknown }) {
  return Object.assign(new Error(`Google responded with ${response.status}`), { response });
}
