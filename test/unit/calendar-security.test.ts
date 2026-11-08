// @vitest-environment node

import { expect, test } from "vitest";
import {
  calendarEventIdSchema,
  calendarEventSchema,
  decryptCredential,
  encryptCredential,
} from "~/server/calendar/security";

test("credentials reject tampering, different users, origins, and keys", () => {
  const context = "calendar:student-1:https://preview.example.com";
  const key = "ab".repeat(32);
  const encrypted = encryptCredential("secret-token", key, context);
  expect(decryptCredential(encrypted, key, context)).toBe("secret-token");
  expect(encrypted).not.toContain("secret-token");
  expect(() => decryptCredential(encrypted, "cd".repeat(32), context)).toThrow();
  expect(() => decryptCredential(encrypted, key, `${context}other-user`)).toThrow();
  expect(() => decryptCredential(`${encrypted.slice(0, -2)}xx`, key, context)).toThrow();
});

test("event validation rejects foreign calendars, unknown fields, invalid dates, and URLs as IDs", () => {
  const event = {
    summary: "Study Group",
    description: "Course: 15-112",
    location: "Library",
    start: { dateTime: "2026-10-03T14:00:00Z", timeZone: "America/New_York" },
    end: { dateTime: "2026-10-03T15:00:00Z", timeZone: "America/New_York" },
  };
  expect(calendarEventSchema.safeParse(event).success).toBe(true);
  expect(calendarEventSchema.safeParse({ ...event, calendarId: "other-calendar" }).success).toBe(
    false,
  );
  expect(calendarEventSchema.safeParse({ ...event, end: event.start }).success).toBe(false);
  expect(calendarEventIdSchema.safeParse("https://evil.example").success).toBe(false);
});
