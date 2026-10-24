import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

export class CalendarError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: 400 | 401 | 403 | 404 | 409 | 502 | 503 = 400,
  ) {
    super(message);
    this.name = "CalendarError";
  }
}

export function encryptCredential(
  value: string,
  key: string,
  context: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptCredential(
  value: string,
  key: string,
  context: string,
): string {
  const parts = value.split(".");
  if (parts.length !== 3)
    throw new Error("Invalid encrypted Calendar credential");
  const [iv, tag, encrypted] = parts.map((part) =>
    Buffer.from(part, "base64url"),
  );
  if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !encrypted) {
    throw new Error("Invalid encrypted Calendar credential");
  }
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function readRelayState(state: string, callbackURL: string): void {
  try {
    if (state.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(state))
      throw new Error();
    const parsed = z
      .object({
        return_to: z.literal(callbackURL),
        csrf: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      })
      .strict()
      .parse(JSON.parse(Buffer.from(state, "base64url").toString("utf8")));
    if (Buffer.from(JSON.stringify(parsed)).toString("base64url") !== state)
      throw new Error();
  } catch {
    throw new CalendarError(
      "Invalid Calendar authorization state",
      "invalid_state",
    );
  }
}

export function hasRequiredScopes(scopes: string[]): boolean {
  return CALENDAR_SCOPES.every((scope) => scopes.includes(scope));
}

const eventTime = z
  .object({
    dateTime: z.string().datetime({ offset: true }),
    timeZone: z.literal("America/New_York"),
  })
  .strict();

export const calendarEventSchema = z
  .object({
    summary: z.string().min(1).max(300),
    location: z.string().max(500),
    description: z.string().max(7000),
    start: eventTime,
    end: eventTime,
    attendees: z
      .array(z.object({ email: z.string().email() }).strict())
      .max(1)
      .optional(),
    reminders: z
      .object({
        useDefault: z.boolean(),
        overrides: z
          .array(
            z
              .object({
                method: z.enum(["email", "popup"]),
                minutes: z.number().int().min(0).max(40320),
              })
              .strict(),
          )
          .max(5),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (event) =>
      Date.parse(event.end.dateTime) > Date.parse(event.start.dateTime),
    {
      message: "Event must end after it starts",
    },
  );

export const calendarEventIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,500}$/);
