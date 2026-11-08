import { createMiddleware } from "hono/factory";

import { getSession } from "~/lib/auth";
import { getUserEligibility } from "~/server/eligibility/service";

export type ApiEnvironment = {
  Variables: {
    userId: string;
    sessionId: string;
  };
};

export const requireSession = createMiddleware<ApiEnvironment>(async (context, next) => {
  const session = await getSession(context.req.raw.headers);

  if (!session) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  context.set("userId", session.user.id);
  context.set("sessionId", session.session.id);
  return next();
});

export const requireEligibleSession = createMiddleware<ApiEnvironment>(async (context, next) => {
  const session = await getSession(context.req.raw.headers);

  if (!session) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const eligibility = await getUserEligibility(session.user.id, session.user.andrewID);

  if (eligibility === "INELIGIBLE") {
    return context.json({ error: "Student eligibility is required" }, 403);
  }

  if (eligibility === "UNAVAILABLE") {
    return context.json({ error: "Student eligibility could not be verified. Please retry." }, 503);
  }

  context.set("userId", session.user.id);
  context.set("sessionId", session.session.id);
  return next();
});
