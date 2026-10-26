import { redirect } from "next/navigation";
import { requireServerSession } from "~/lib/auth";
import { userHasCreatedProfile } from "~/features/profile/services/serverAccountService";
import { getUserEligibility } from "~/server/eligibility/service";
import { destinationQuery, groupDestination } from "./group-destination";

export async function requireContentAccess(
  next?: string,
  requireProfile = true,
) {
  const destination = groupDestination(next);
  const query = destinationQuery(destination);
  const session = await requireServerSession();
  if (!session?.user.email) redirect(`/${query}`);
  const eligibility = await getUserEligibility(
    session.user.id,
    session.user.andrewID,
  );
  if (eligibility === "INELIGIBLE") redirect("/access-restricted");
  if (eligibility === "UNAVAILABLE") redirect("/eligibility-unavailable");
  if (requireProfile && !(await userHasCreatedProfile(session.user.id))) {
    redirect(`/create-account${query}`);
  }
  return session;
}
