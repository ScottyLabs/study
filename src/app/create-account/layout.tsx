import "~/styles/globals.css";
import React from "react";
import { redirect } from "next/navigation";

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

  const eligibility = await getUserEligibility(
    session.user.id,
    session.user.andrewID,
  );

  if (eligibility === "INELIGIBLE") {
    redirect("/access-restricted");
  }

  if (eligibility === "UNAVAILABLE") {
    redirect("/eligibility-unavailable");
  }

  return (
    <div className="app-shell">
      <div className="app-content">
        <main className="app-main-padded">{children}</main>
      </div>
    </div>
  );
}
