import { requireContentAccess } from "~/lib/require-content-access";
import { AuthenticatedShell } from "~/components/layout/AuthenticatedShell";
import { SharedGroupPage } from "~/features/groups/components/SharedGroupPage";

export default async function GroupPage({
  params,
}: {
  params: { groupId: string };
}) {
  await requireContentAccess(`/groups/${params.groupId}`);
  return (
    <AuthenticatedShell>
      <SharedGroupPage groupId={params.groupId} />
    </AuthenticatedShell>
  );
}
