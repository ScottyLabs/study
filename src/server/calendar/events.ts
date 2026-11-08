import { z } from "zod";
import { calendar_v3 } from "googleapis/build/src/apis/calendar/v3";
import type { Credentials } from "google-auth-library";
import type { CalendarConnection } from "@prisma/client";

import { db } from "~/server/db";
import { CalendarError, hasRequiredScopes } from "./security";
import { connectionKey, decrypt, encrypt, oauthClient } from "./service";

const providerResponse = z.object({
  response: z.object({
    status: z.number().optional(),
    data: z.object({ error: z.unknown() }).optional(),
  }),
});

const scopeError = z.object({ errors: z.array(z.object({ reason: z.string() })) });

async function requireReconnection(connection: CalendarConnection): Promise<never> {
  await db.calendarConnection.updateMany({
    where: { id: connection.id, accessToken: connection.accessToken },
    data: { requiresReconnection: true },
  });
  console.warn("Calendar connection requires authorization");
  throw new CalendarError("Reconnect Google Calendar to continue", "reconnect_required", 409);
}

function providerError(error: unknown) {
  const parsed = providerResponse.safeParse(error);
  const response = parsed.success ? parsed.data.response : undefined;
  const scopes = scopeError.safeParse(response?.data?.error);
  return {
    status: response?.status,
    code: response?.data?.error,
    scopeDenied:
      scopes.success &&
      scopes.data.errors.some((item) => item.reason === "insufficientPermissions"),
  };
}

async function persistRefreshedCredentials(
  connection: CalendarConnection,
  accessToken: string,
  expiryDate: number,
  refreshToken: string,
) {
  const data = {
    accessToken: encrypt(accessToken, connection.userId),
    accessTokenExpiresAt: new Date(expiryDate),
    ...(refreshToken === "" ? {} : { refreshToken: encrypt(refreshToken, connection.userId) }),
  };
  await db.calendarConnection.updateMany({
    where: { id: connection.id, updatedAt: connection.updatedAt },
    data,
  });
  return { ...connection, ...data };
}

async function refreshConnection(
  client: ReturnType<typeof oauthClient>,
  connection: CalendarConnection,
) {
  let credentials: Credentials;
  try {
    ({ credentials } = await client.refreshAccessToken());
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
  const accessToken = credentials.access_token ?? "";
  const expiryDate = credentials.expiry_date ?? 0;
  if (accessToken === "" || expiryDate === 0) {
    console.warn("Calendar token refresh failed", { code: "provider_error" });
    throw new CalendarError(
      "Calendar is temporarily unavailable. Please retry.",
      "provider_error",
      502,
    );
  }
  const scope = credentials.scope ?? "";
  if (scope !== "" && !hasRequiredScopes(scope.split(/\s+/u))) {
    return requireReconnection(connection);
  }
  return persistRefreshedCredentials(
    connection,
    accessToken,
    expiryDate,
    credentials.refresh_token ?? "",
  );
}

async function calendarClient(userId: string) {
  let connection = await db.calendarConnection.findUnique({
    where: { userId_appOrigin: connectionKey(userId) },
  });
  if (!connection)
    throw new CalendarError("Connect Google Calendar to continue", "reconnect_required", 409);
  if (connection.requiresReconnection || !hasRequiredScopes(connection.scopes)) {
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
    connection = await refreshConnection(client, connection);
  }
  // Refresh explicitly above; do not let the client replay a Calendar mutation.
  client.setCredentials({ access_token: client.credentials.access_token });
  return { connection, calendar: new calendar_v3.Calendar({ auth: client }) };
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
        ? await calendar.events.insert({ calendarId: "primary", requestBody: event }, options)
        : await calendar.events.patch(
            { calendarId: "primary", eventId, requestBody: event },
            options,
          );
    return { id: data.id, htmlLink: data.htmlLink };
  } catch (error) {
    const { status, scopeDenied } = providerError(error);
    if (status === 401 || (status === 403 && scopeDenied)) return requireReconnection(connection);
    if (status === 404 || status === 410) {
      if (method === "delete") return { deleted: true };
      throw new CalendarError("Calendar event not found", "missing_event", 404);
    }
    console.warn("Calendar event request failed", {
      operation: method,
      status,
    });
    throw new CalendarError("Calendar request failed. Please retry.", "provider_error", 502);
  }
}
