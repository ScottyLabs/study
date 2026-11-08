import { requireContentAccess } from "~/lib/require-content-access";
import { AuthenticatedShell } from "~/components/layout/AuthenticatedShell";
import { SharedGroupPage } from "~/features/groups/components/SharedGroupPage";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireContentAccess(`/groups/${groupId}`);
  return (
    <AuthenticatedShell>
      <SharedGroupPage groupId={groupId} />
    </AuthenticatedShell>
  );
}
