import { redirect } from "next/navigation";
import { requireContentAccess } from "~/lib/require-content-access";
import { groupDestination } from "~/lib/group-destination";

export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = groupDestination(searchParams.next);
  await requireContentAccess(next);
  redirect(next);
}
