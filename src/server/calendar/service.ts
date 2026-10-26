import { randomBytes } from "node:crypto";
import { z } from "zod";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { calendar_v3 } from "googleapis/build/src/apis/calendar/v3";
import type { Credentials } from "google-auth-library";
import type { CalendarConnection } from "@prisma/client";

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
const connectionKey = (userId: string) => ({
  userId,
  appOrigin: calendarOrigin(),
});
const credentialContext = (userId: string) =>
  `calendar:${userId}:${calendarOrigin()}`;

export function isCalendarConfigured(): boolean {
  return Boolean(
    env.CALENDAR_CLIENT_ID &&
      env.CALENDAR_CLIENT_SECRET &&
      env.CALENDAR_TOKEN_ENCRYPTION_KEY,
  );
}

function encryptionKey(): string {
  if (!isCalendarConfigured()) {
    throw new CalendarError(
      "Calendar integration is not configured",
      "not_configured",
      503,
    );
  }
  return env.CALENDAR_TOKEN_ENCRYPTION_KEY!;
}

function oauthClient(): OAuth2Client {
  encryptionKey();
  return new OAuth2Client({
    clientId: env.CALENDAR_CLIENT_ID,
    clientSecret: env.CALENDAR_CLIENT_SECRET,
    redirectUri: env.OAUTH_RELAY_URL,
    transporterOptions: { timeout: 8_000, retry: false },
  });
}

function encrypt(value: string, userId: string): string {
  return encryptCredential(value, encryptionKey(), credentialContext(userId));
}

function decrypt(value: string, userId: string): string {
  return decryptCredential(value, encryptionKey(), credentialContext(userId));
}

export async function getCalendarStatus(userId: string) {
  if (!isCalendarConfigured()) return { configured: false, connected: false };
  const connection = await db.calendarConnection.findUnique({
    where: { userId_appOrigin: connectionKey(userId) },
  });
  return {
    configured: true,
    connected: Boolean(
      connection &&
        !connection.requiresReconnection &&
        hasRequiredScopes(connection.scopes),
    ),
  };
}

export async function startCalendarAuthorization(
  userId: string,
  sessionId: string,
) {
  const client = oauthClient();
  const { codeVerifier, codeChallenge } =
    await client.generateCodeVerifierAsync();
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

export async function getCalendarAttemptStatus(
  userId: string,
  sessionId: string,
  id: string,
) {
  const attempt = await db.calendarAuthAttempt.findFirst({
    where: { id, ...connectionKey(userId), sessionId },
  });
  if (!attempt)
    throw new CalendarError(
      "Calendar authorization not found",
      "missing_attempt",
      404,
    );
  return {
    status: attempt.expiresAt <= new Date() ? "expired" : attempt.status,
  };
}

export async function completeCalendarAuthorization(
  userId: string,
  sessionId: string,
  params: URLSearchParams,
) {
  const state = params.get("state") ?? "";
  readRelayState(state, callbackURL());
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
    throw new CalendarError(
      "Calendar authorization was already used",
      "used_state",
    );

  try {
    if (params.has("error")) {
      throw new CalendarError(
        "Calendar authorization was declined",
        "authorization_denied",
      );
    }
    const code = params.get("code");
    if (!code || code.length > 4096)
      throw new CalendarError("Missing authorization code", "missing_code");
    const { tokens } = await oauthClient().getToken({
      code,
      codeVerifier: decrypt(attempt.codeVerifier, userId),
      redirect_uri: env.OAUTH_RELAY_URL,
    });
    if (!tokens.access_token || !tokens.expiry_date) {
      throw new CalendarError(
        "Google did not return Calendar credentials",
        "missing_credentials",
      );
    }
    const tokenInfo = await oauthClient().getTokenInfo(tokens.access_token);
    const scopes = tokenInfo.scopes;
    if (!hasRequiredScopes(scopes)) {
      throw new CalendarError(
        "Required Calendar permissions were not granted",
        "insufficient_scope",
      );
    }
    const existing = await db.calendarConnection.findUnique({
      where: { userId_appOrigin: connectionKey(userId) },
    });
    // Retain a refresh token only if it authorizes the same Google account.
    let refreshToken = tokens.refresh_token;
    if (!refreshToken && existing && !existing.requiresReconnection) {
      if (
        existing.googleAccountId &&
        existing.googleAccountId === tokenInfo.sub
      ) {
        refreshToken = decrypt(existing.refreshToken, userId);
      }
    }
    if (!refreshToken) {
      throw new CalendarError(
        "Reconnect Calendar to grant offline access",
        "missing_refresh_token",
      );
    }
    const data = {
      googleAccountId: tokenInfo.sub ?? null,
      accessToken: encrypt(tokens.access_token, userId),
      refreshToken: encrypt(refreshToken, userId),
      accessTokenExpiresAt: new Date(tokens.expiry_date),
      scopes,
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
    throw new CalendarError(
      "Calendar authorization failed. Please retry.",
      "provider_error",
      502,
    );
  }
}

async function requireReconnection(
  connection: CalendarConnection,
): Promise<never> {
  await db.calendarConnection.updateMany({
    where: { id: connection.id, accessToken: connection.accessToken },
    data: { requiresReconnection: true },
  });
  console.warn("Calendar connection requires authorization");
  throw new CalendarError(
    "Reconnect Google Calendar to continue",
    "reconnect_required",
    409,
  );
}

function providerError(error: unknown) {
  const response = (
    error as { response?: { status?: number; data?: { error?: unknown } } }
  )?.response;
  const scopeError = z
    .object({ errors: z.array(z.object({ reason: z.string() })) })
    .safeParse(response?.data?.error);
  return {
    status: response?.status,
    code: response?.data?.error,
    scopeDenied:
      scopeError.success &&
      scopeError.data.errors.some(
        (item) => item.reason === "insufficientPermissions",
      ),
  };
}

async function calendarClient(userId: string) {
  let connection = await db.calendarConnection.findUnique({
    where: { userId_appOrigin: connectionKey(userId) },
  });
  if (!connection)
    throw new CalendarError(
      "Connect Google Calendar to continue",
      "reconnect_required",
      409,
    );
  if (
    connection.requiresReconnection ||
    !hasRequiredScopes(connection.scopes)
  ) {
    return requireReconnection(connection);
  }
  const client = oauthClient();
  try {
    client.setCredentials({
      access_token: decrypt(connection.accessToken, userId),
      refresh_token: decrypt(connection.refreshToken, userId),
      expiry_date: connection.accessTokenExpiresAt.getTime(),
    });
  } catch {
    return requireReconnection(connection);
  }
  if (connection.accessTokenExpiresAt.getTime() <= Date.now() + 60_000) {
    try {
      const { credentials } = await client.refreshAccessToken();
      if (!credentials.access_token || !credentials.expiry_date)
        throw new Error("Missing refreshed credentials");
      if (
        credentials.scope &&
        !hasRequiredScopes(credentials.scope.split(/\s+/))
      ) {
        return requireReconnection(connection);
      }
      connection = await persistRefreshedCredentials(connection, credentials);
    } catch (error) {
      const { code } = providerError(error);
      if (code === "invalid_grant" || code === "invalid_token")
        return requireReconnection(connection);
      console.warn("Calendar token refresh failed", { code: "provider_error" });
      throw new CalendarError(
        "Calendar is temporarily unavailable. Please retry.",
        "provider_error",
        502,
      );
    }
  }
  // Refresh explicitly above; do not let the client replay a Calendar mutation.
  client.setCredentials({ access_token: client.credentials.access_token });
  return { connection, calendar: new calendar_v3.Calendar({ auth: client }) };
}

async function persistRefreshedCredentials(
  connection: CalendarConnection,
  tokens: Credentials,
) {
  const data = {
    accessToken: encrypt(tokens.access_token!, connection.userId),
    accessTokenExpiresAt: new Date(tokens.expiry_date!),
    ...(tokens.refresh_token
      ? { refreshToken: encrypt(tokens.refresh_token, connection.userId) }
      : {}),
  };
  await db.calendarConnection.updateMany({
    where: { id: connection.id, updatedAt: connection.updatedAt },
    data,
  });
  return { ...connection, ...data };
}

export async function calendarEventRequest(
  userId: string,
  method: "create" | "update" | "delete",
  eventId?: string,
  event?: calendar_v3.Schema$Event,
) {
  const { connection, calendar } = await calendarClient(userId);
  const options = { timeout: 8_000, retry: false };
  try {
    if (method === "delete") {
      await calendar.events.delete({ calendarId: "primary", eventId }, options);
      return { deleted: true };
    }
    const { data } =
      method === "create"
        ? await calendar.events.insert(
            { calendarId: "primary", requestBody: event },
            options,
          )
        : await calendar.events.patch(
            { calendarId: "primary", eventId, requestBody: event },
            options,
          );
    return { id: data.id, htmlLink: data.htmlLink };
  } catch (error) {
    const { status, scopeDenied } = providerError(error);
    if (status === 401 || (status === 403 && scopeDenied))
      return requireReconnection(connection);
    if (status === 404 || status === 410) {
      if (method === "delete") return { deleted: true };
      throw new CalendarError("Calendar event not found", "missing_event", 404);
    }
    console.warn("Calendar event request failed", {
      operation: method,
      status,
    });
    throw new CalendarError(
      "Calendar request failed. Please retry.",
      "provider_error",
      502,
    );
  }
}
