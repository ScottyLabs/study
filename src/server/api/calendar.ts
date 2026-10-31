import { Hono } from "hono";
import { z } from "zod";
import { requireEligibleSession, type ApiEnvironment } from "./auth-middleware";
import {
  calendarOrigin,
  calendarEventRequest,
  getCalendarAttemptStatus,
  getBusyIntervals,
  getCalendarStatus,
  startCalendarAuthorization,
} from "~/server/calendar/service";
import {
  CalendarError,
  calendarEventIdSchema,
  calendarEventSchema,
} from "~/server/calendar/security";

export const calendarApi = new Hono<ApiEnvironment>();

const MAX_BUSY_RANGE_MS = 60 * 24 * 60 * 60_000;
const busyDate = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));
const busyRangeSchema = z.object({ from: busyDate, to: busyDate });

// Checked after parsing: zod still runs object refinements on invalid fields.
function isAllowedBusyRange({ from, to }: { from: Date; to: Date }) {
  return (
    from.getTime() >= Date.now() - 60_000 &&
    to > from &&
    to.getTime() - from.getTime() <= MAX_BUSY_RANGE_MS
  );
}

calendarApi.use("*", requireEligibleSession);
calendarApi.use("*", async (context, next) => {
  context.header("Cache-Control", "no-store");
  if (
    context.req.method !== "GET" &&
    context.req.header("Origin") !== calendarOrigin()
  ) {
    return context.json({ error: "Same-origin request required" }, 403);
  }
  await next();
});

calendarApi.onError((error, context) => {
  if (error instanceof CalendarError) {
    return context.json(
      { error: error.message, code: error.code },
      error.status,
    );
  }
  console.warn("Calendar API failed", { code: "internal_error" });
  return context.json({ error: "Calendar is temporarily unavailable" }, 503);
});

calendarApi.get("/status", async (context) => {
  return context.json(await getCalendarStatus(context.var.userId));
});

calendarApi.post("/authorize", async (context) => {
  return context.json(
    await startCalendarAuthorization(context.var.userId, context.var.sessionId),
  );
});

calendarApi.get("/attempts/:id", async (context) => {
  const id = z.string().uuid().safeParse(context.req.param("id"));
  if (!id.success)
    return context.json({ error: "Invalid authorization attempt" }, 400);
  return context.json(
    await getCalendarAttemptStatus(
      context.var.userId,
      context.var.sessionId,
      id.data,
    ),
  );
});

calendarApi.get("/busy", async (context) => {
  const range = busyRangeSchema.safeParse(context.req.query());
  if (!range.success || !isAllowedBusyRange(range.data))
    return context.json({ error: "Invalid availability range" }, 400);
  return context.json({
    busy: await getBusyIntervals(
      context.var.userId,
      range.data.from,
      range.data.to,
    ),
  });
});

calendarApi.post("/events", async (context) => {
  const event = calendarEventSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!event.success)
    return context.json({ error: "Invalid Calendar event" }, 400);
  return context.json(
    await calendarEventRequest(
      context.var.userId,
      "create",
      undefined,
      event.data,
    ),
    201,
  );
});

calendarApi.patch("/events/:id", async (context) => {
  const id = calendarEventIdSchema.safeParse(context.req.param("id"));
  const event = calendarEventSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!id.success || !event.success)
    return context.json({ error: "Invalid Calendar event" }, 400);
  return context.json(
    await calendarEventRequest(
      context.var.userId,
      "update",
      id.data,
      event.data,
    ),
  );
});

calendarApi.delete("/events/:id", async (context) => {
  const id = calendarEventIdSchema.safeParse(context.req.param("id"));
  if (!id.success)
    return context.json({ error: "Invalid Calendar event ID" }, 400);
  return context.json(
    await calendarEventRequest(context.var.userId, "delete", id.data),
  );
});
