import { auth } from "~/lib/auth";
import {
  calendarOrigin,
  completeCalendarAuthorization,
} from "~/server/calendar/service";
import { CalendarError } from "~/server/calendar/security";
import { getUserEligibility } from "~/server/eligibility/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let status = "failed";
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      throw new CalendarError("Session required", "missing_session", 401);
    const eligibility = await getUserEligibility(
      session.user.id,
      session.user.andrewID,
    );
    if (eligibility !== "ELIGIBLE")
      throw new CalendarError(
        "Student eligibility required",
        "ineligible",
        403,
      );
    await completeCalendarAuthorization(
      session.user.id,
      session.session.id,
      new URL(request.url).searchParams,
    );
    status = "success";
  } catch (error) {
    console.warn("Calendar callback failed", {
      code: error instanceof CalendarError ? error.code : "internal_error",
    });
  }
  // Remove the authorization code from the popup URL before rendering any content.
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${calendarOrigin()}/api/calendar/oauth/result?status=${status}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
