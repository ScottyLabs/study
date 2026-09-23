import "server-only";

import { db } from "~/server/db";

export async function userHasCreatedProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { courseCodes: true },
  });

  return (user?.courseCodes.length ?? 0) > 0;
}
