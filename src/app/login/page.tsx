import { redirect } from "next/navigation";

import { userHasCreatedProfile } from "~/features/profile/services/serverAccountService";
import { requireServerSession } from "~/lib/auth";
import { getUserEligibility } from "~/server/eligibility/service";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await requireServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const email = session.user.email;

  if (!email) {
    redirect("/");
  }

  const eligibility = await getUserEligibility(session.user.id, session.user.andrewID);

  if (eligibility === "INELIGIBLE") {
    redirect("/access-restricted");
  }

  if (eligibility === "UNAVAILABLE") {
    redirect("/eligibility-unavailable");
  }

  if (!(await userHasCreatedProfile(session.user.id))) {
    redirect("/create-account");
  }
  redirect("/feed");
}
