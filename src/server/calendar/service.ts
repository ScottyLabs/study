import { randomBytes } from "node:crypto";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import type { CalendarAuthAttempt } from "@prisma/client";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  CALENDAR_SCOPES,
  CalendarError,
  decryptCredential,
  encryptCredential,
  hashState,
  hasRequiredScopes,
  readRelayState,
} from "./security";

export const calendarOrigin = () => new URL(env.SERVER_URL).origin;
const callbackURL = () => `${calendarOrigin()}/api/calendar/oauth/callback`;
export const connectionKey = (userId: string) => ({
  userId,
  appOrigin: calendarOrigin(),
});
const credentialContext = (userId: string) => `calendar:${userId}:${calendarOrigin()}`;

export function isCalendarConfigured(): boolean {
  return [
    env.CALENDAR_CLIENT_ID,
    env.CALENDAR_CLIENT_SECRET,
    env.CALENDAR_TOKEN_ENCRYPTION_KEY,
  ].every((setting) => setting !== undefined);
}

function encryptionKey(): string {
  const key = env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!isCalendarConfigured() || key === undefined) {
    throw new CalendarError("Calendar integration is not configured", "not_configured", 503);
  }
  return key;
}

export function oauthClient(): OAuth2Client {
  encryptionKey();
  return new OAuth2Client({
    clientId: env.CALENDAR_CLIENT_ID,
    clientSecret: env.CALENDAR_CLIENT_SECRET,
    redirectUri: env.OAUTH_RELAY_URL,
    transporterOptions: { timeout: 8_000, retry: false },
  });
}

export function encrypt(value: string, userId: string): string {
  return encryptCredential(value, encryptionKey(), credentialContext(userId));
}

export function decrypt(value: string, userId: string): string {
  return decryptCredential(value, encryptionKey(), credentialContext(userId));
}

export async function getCalendarStatus(userId: string) {
  if (!isCalendarConfigured()) return { configured: false, connected: false };
  const connection = await db.calendarConnection.findUnique({
    where: { userId_appOrigin: connectionKey(userId) },
  });
  return {
    configured: true,
    connected:
      connection !== null &&
      !connection.requiresReconnection &&
      hasRequiredScopes(connection.scopes),
  };
}

export async function startCalendarAuthorization(userId: string, sessionId: string) {
  const client = oauthClient();
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = Buffer.from(
    JSON.stringify({
      return_to: callbackURL(),
      csrf: randomBytes(32).toString("base64url"),
    }),
  ).toString("base64url");

  await db.calendarAuthAttempt.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  // A later attempt supersedes an abandoned popup for this session.
  await db.calendarAuthAttempt.updateMany({
    where: { ...connectionKey(userId), sessionId, status: "pending" },
    data: { status: "cancelled" },
  });
  const attempt = await db.calendarAuthAttempt.create({
    data: {
      ...connectionKey(userId),
      sessionId,
      stateHash: hashState(state),
      codeVerifier: encrypt(codeVerifier, userId),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });
  const authorizationUrl = client.generateAuthUrl({
    state,
    scope: CALENDAR_SCOPES,
    access_type: "offline",
    prompt: "consent select_account",
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });
  return { attemptId: attempt.id, authorizationUrl };
}

export async function getCalendarAttemptStatus(userId: string, sessionId: string, id: string) {
  const attempt = await db.calendarAuthAttempt.findFirst({
    where: { id, ...connectionKey(userId), sessionId },
  });
  if (!attempt) throw new CalendarError("Calendar authorization not found", "missing_attempt", 404);
  return {
    status: attempt.expiresAt <= new Date() ? "expired" : attempt.status,
  };
}

async function claimAttempt(userId: string, sessionId: string, state: string) {
  const attempt = await db.calendarAuthAttempt.findUnique({
    where: { stateHash: hashState(state) },
  });
  if (
    !attempt ||
    attempt.userId !== userId ||
    attempt.sessionId !== sessionId ||
    attempt.appOrigin !== calendarOrigin() ||
    attempt.expiresAt <= new Date()
  ) {
    throw new CalendarError(
      "Calendar authorization expired or does not match this session",
      "invalid_state",
    );
  }
  const claimed = await db.calendarAuthAttempt.updateMany({
    where: { id: attempt.id, status: "pending", expiresAt: { gt: new Date() } },
    data: { status: "processing" },
  });
  if (claimed.count !== 1)
    throw new CalendarError("Calendar authorization was already used", "used_state");
  return attempt;
}

async function exchangeCode(attempt: CalendarAuthAttempt, params: URLSearchParams) {
  if (params.has("error")) {
    throw new CalendarError("Calendar authorization was declined", "authorization_denied");
  }
  const code = params.get("code") ?? "";
  if (code === "" || code.length > 4096)
    throw new CalendarError("Missing authorization code", "missing_code");
  const { tokens } = await oauthClient().getToken({
    code,
    codeVerifier: decrypt(attempt.codeVerifier, attempt.userId),
    redirect_uri: env.OAUTH_RELAY_URL,
  });
  const accessToken = tokens.access_token ?? "";
  const expiryDate = tokens.expiry_date ?? 0;
  if (accessToken === "" || expiryDate === 0) {
    throw new CalendarError("Google did not return Calendar credentials", "missing_credentials");
  }
  const tokenInfo = await oauthClient().getTokenInfo(accessToken);
  if (!hasRequiredScopes(tokenInfo.scopes)) {
    throw new CalendarError("Required Calendar permissions were not granted", "insufficient_scope");
  }
  return {
    accessToken,
    expiryDate,
    refreshToken: tokens.refresh_token ?? "",
    scopes: tokenInfo.scopes,
    googleAccountId: tokenInfo.sub ?? null,
  };
}

// Retain a refresh token only if it authorizes the same Google account.
async function refreshTokenFor(userId: string, granted: string, googleAccountId: string | null) {
  if (granted !== "") return granted;
  const existing = await db.calendarConnection.findUnique({
    where: { userId_appOrigin: connectionKey(userId) },
  });
  if (
    existing &&
    !existing.requiresReconnection &&
    existing.googleAccountId !== null &&
    existing.googleAccountId === googleAccountId
  ) {
    return decrypt(existing.refreshToken, userId);
  }
  throw new CalendarError("Reconnect Calendar to grant offline access", "missing_refresh_token");
}

async function saveConnection(attempt: CalendarAuthAttempt, params: URLSearchParams) {
  const { userId } = attempt;
  const grant = await exchangeCode(attempt, params);
  const refreshToken = await refreshTokenFor(userId, grant.refreshToken, grant.googleAccountId);
  const data = {
    googleAccountId: grant.googleAccountId,
    accessToken: encrypt(grant.accessToken, userId),
    refreshToken: encrypt(refreshToken, userId),
    accessTokenExpiresAt: new Date(grant.expiryDate),
    scopes: grant.scopes,
    requiresReconnection: false,
  };
  await db.$transaction([
    db.calendarConnection.upsert({
      where: { userId_appOrigin: connectionKey(userId) },
      create: { ...connectionKey(userId), ...data },
      update: data,
    }),
    db.calendarAuthAttempt.update({
      where: { id: attempt.id },
      data: { status: "success", codeVerifier: "" },
    }),
  ]);
}

export async function completeCalendarAuthorization(
  userId: string,
  sessionId: string,
  params: URLSearchParams,
) {
  const state = params.get("state") ?? "";
  readRelayState(state, callbackURL());
  const attempt = await claimAttempt(userId, sessionId, state);
  try {
    await saveConnection(attempt, params);
    console.info("Calendar authorization completed");
  } catch (error) {
    await db.calendarAuthAttempt.update({
      where: { id: attempt.id },
      data: { status: "failed", codeVerifier: "" },
    });
    console.warn("Calendar authorization failed", {
      code: error instanceof CalendarError ? error.code : "provider_error",
    });
    if (error instanceof CalendarError) throw error;
    throw new CalendarError("Calendar authorization failed. Please retry.", "provider_error", 502);
  }
}
