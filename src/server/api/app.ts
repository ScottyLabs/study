import { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { z } from "zod";

import {
  requireEligibleSession,
  type ApiEnvironment,
} from "~/server/api/auth-middleware";
import {
  createGroup,
  getGroup,
  joinGroup,
  leaveGroup,
  listGroups,
  updateGroup,
} from "~/server/api/groups";
import {
  addCourseCode,
  blockUser,
  deleteCourseCode,
  getBlockingState,
  getBlockImpact,
  getCourseCodes,
  getProfile,
  unblockUser,
  updateProfile,
  updateTheme,
} from "~/server/api/profile";

export const api = new Hono<ApiEnvironment>().basePath("/api/v1");

api.onError((error, context) => {
  console.error("API request failed", {
    path: context.req.path,
    error,
  });

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return context.json({ error: "Please retry the request" }, 409);
  }

  return context.json({ error: "Internal server error" }, 500);
});

api.get("/health", (context) =>
  context.json({
    status: "ok",
  }),
);

api.get("/groups", requireEligibleSession, async (context) => {
  const courseCode = context.req.query("courseCode")?.trim();

  if (courseCode === "") {
    return context.json({ error: "courseCode cannot be empty" }, 400);
  }

  const groups = await listGroups(courseCode);
  return context.json({ groups });
});

api.get("/groups/:groupId", requireEligibleSession, async (context) => {
  const group = await getGroup(context.req.param("groupId"));

  if (!group) {
    return context.json({ error: "Group not found" }, 404);
  }

  return context.json({ group });
});

const groupInputSchema = z.object({
  courseCode: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  purpose: z.string().trim().min(1).max(500),
  details: z.string().max(5000),
  location: z.string().trim().min(1).max(200),
  startTime: z.coerce.date(),
  totalSeats: z.coerce.number().int().positive(),
  calendarEventId: z.string().trim().max(500).optional(),
});

api.post("/groups", requireEligibleSession, async (context) => {
  const input = groupInputSchema.safeParse(await context.req.json());

  if (!input.success) {
    return context.json({ error: "Invalid group input" }, 400);
  }

  const group = await createGroup(input.data, context.var.userId);
  return context.json({ group }, 201);
});

api.post("/groups/:groupId/join", requireEligibleSession, async (context) => {
  const input = z
    .object({ calendarEventId: z.string().trim().max(500).optional() })
    .safeParse(await context.req.json().catch(() => ({})));

  if (!input.success) {
    return context.json({ error: "Invalid calendar event ID" }, 400);
  }

  const result = await joinGroup(
    context.req.param("groupId"),
    context.var.userId,
    input.data.calendarEventId,
  );

  if (result.kind === "missing") {
    return context.json({ error: "Group not found" }, 404);
  }

  if (result.kind === "already_joined") {
    return context.json({ error: "Already joined" }, 409);
  }

  if (result.kind === "blocked") {
    return context.json({ error: "Cannot join this group" }, 403);
  }

  if (result.kind === "full") {
    return context.json({ error: "Group is full" }, 409);
  }

  return context.json({ joined: true });
});

api.delete("/groups/:groupId/join", requireEligibleSession, async (context) => {
  const result = await leaveGroup(
    context.req.param("groupId"),
    context.var.userId,
  );

  if (!result.left) {
    return context.json({ error: "Membership not found" }, 404);
  }

  return context.json(result);
});

api.patch("/groups/:groupId", requireEligibleSession, async (context) => {
  const input = groupInputSchema.safeParse(await context.req.json());

  if (!input.success) {
    return context.json({ error: "Invalid group input" }, 400);
  }

  const group = await updateGroup(
    context.req.param("groupId"),
    context.var.userId,
    input.data,
  );

  if (!group) {
    return context.json({ error: "Group membership required" }, 403);
  }

  return context.json({ group });
});

api.get("/me/profile", requireEligibleSession, async (context) => {
  return context.json({ profile: await getProfile(context.var.userId) });
});

const profileUpdateSchema = z.object({
  year: z.string().max(50).optional(),
  majors: z.string().max(500).optional(),
  minors: z.string().max(500).optional(),
});

api.patch("/me/profile", requireEligibleSession, async (context) => {
  const input = profileUpdateSchema.safeParse(await context.req.json());

  if (!input.success) {
    return context.json({ error: "Invalid profile input" }, 400);
  }

  return context.json({
    profile: await updateProfile(context.var.userId, input.data),
  });
});

api.patch("/me/theme", requireEligibleSession, async (context) => {
  const input = z
    .object({ theme: z.enum(["light", "dark"]) })
    .safeParse(await context.req.json());

  if (!input.success) {
    return context.json({ error: "Invalid theme" }, 400);
  }

  await updateTheme(context.var.userId, input.data.theme);
  return context.json({ theme: input.data.theme });
});

api.get("/me/courses", requireEligibleSession, async (context) => {
  return context.json({
    courseCodes: await getCourseCodes(context.var.userId),
  });
});

api.post("/me/courses", requireEligibleSession, async (context) => {
  const input = z
    .object({ courseCode: z.string().trim().min(1).max(20) })
    .safeParse(await context.req.json());

  if (!input.success) {
    return context.json({ error: "Invalid course code" }, 400);
  }

  await addCourseCode(context.var.userId, input.data.courseCode);
  return context.json({ added: true }, 201);
});

api.delete(
  "/me/courses/:courseCode",
  requireEligibleSession,
  async (context) => {
    await deleteCourseCode(context.var.userId, context.req.param("courseCode"));
    return context.json({ deleted: true });
  },
);

api.get("/me/blocking", requireEligibleSession, async (context) => {
  return context.json(await getBlockingState(context.var.userId));
});

api.post("/me/blocks", requireEligibleSession, async (context) => {
  const input = z
    .object({ email: z.string().trim().email() })
    .safeParse(await context.req.json());

  if (!input.success) {
    return context.json({ error: "Invalid email" }, 400);
  }

  const result = await blockUser(context.var.userId, input.data.email);

  if (result.kind === "missing_blocker") {
    return context.json({ error: "Unauthorized" }, 401);
  }

  if (result.kind === "self") {
    return context.json({ error: "Cannot block yourself" }, 400);
  }

  return context.json(result, 201);
});

api.delete("/me/blocks/:email", requireEligibleSession, async (context) => {
  const deleted = await unblockUser(
    context.var.userId,
    context.req.param("email"),
  );

  if (!deleted) {
    return context.json({ error: "Block not found" }, 404);
  }

  return context.json({ deleted: true });
});

api.get("/me/blocks/:email/impact", requireEligibleSession, async (context) => {
  const impact = await getBlockImpact(
    context.var.userId,
    context.req.param("email"),
  );

  return context.json(impact);
});
