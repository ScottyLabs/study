import "~/styles/globals.css";
import { redirect } from "next/navigation";
import NavBar from "~/components/layout/NavBar";
import React from "react";
import { userHasCreatedProfile } from "~/features/profile/services/serverAccountService";
import { requireServerSession } from "~/lib/auth";
import { getUserEligibility } from "~/server/eligibility/service";

export const metadata = {
  title: "CMU Study",
  description: "Totally novel way to support your grade",
  icons: [{ rel: "icon", url: "/CMUStudy.ico" }],
};

export default async function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="app-shell">
      <NavBar />
      <div className="app-content">
        <div className="app-main">{children}</div>
      </div>
    </div>
  );
}
