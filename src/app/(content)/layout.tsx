import type { ReactNode } from "react";
import { requireContentAccess } from "~/lib/require-content-access";
import { AuthenticatedShell } from "~/components/layout/AuthenticatedShell";
import { GroupDataProvider } from "~/features/groups/GroupDataContext";

export const metadata = {
  title: "CMU Study",
  description: "Totally novel way to support your grade",
  icons: [{ rel: "icon", url: "/CMUStudy.ico" }],
};

export default async function ContentLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireContentAccess();

  return (
    <GroupDataProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </GroupDataProvider>
  );
}
