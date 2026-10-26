import "~/styles/globals.css";
import React from "react";
import { requireContentAccess } from "~/lib/require-content-access";

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
  await requireContentAccess(undefined, false);

  return (
    <div className="app-shell">
      <div className="app-standalone-content">
        <main className="app-main-padded">{children}</main>
      </div>
    </div>
  );
}
