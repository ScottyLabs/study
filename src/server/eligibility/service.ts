import "server-only";

import type { DirectoryEligibility } from "@prisma/client";

import { db } from "~/server/db";
import { checkDirectoryEligibility } from "~/server/eligibility/directory";

const DIRECTORY_CHECK_TTL_MS = 24 * 60 * 60 * 1000;
const DIRECTORY_UNAVAILABLE_TTL_MS = 1 * 60 * 1000;

export type UserEligibility = "ELIGIBLE" | "INELIGIBLE" | "UNAVAILABLE";

function isCachedEligibility(
  eligibility: DirectoryEligibility,
  expiresAt: Date | null,
  now: Date,
) {
  return eligibility !== "UNCHECKED" && Boolean(expiresAt && expiresAt > now);
}

export async function getUserEligibility(
  userId: string,
  andrewID: string | null | undefined,
): Promise<UserEligibility> {
  if (!andrewID) return "UNAVAILABLE";

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      directoryEligibility: true,
      directoryCheckExpiresAt: true,
    },
  });

  if (!user) return "UNAVAILABLE";

  const now = new Date();
  if (
    isCachedEligibility(
      user.directoryEligibility,
      user.directoryCheckExpiresAt,
      now,
    )
  ) {
    if (user.directoryEligibility === "ELIGIBLE") return "ELIGIBLE";
    if (user.directoryEligibility === "INELIGIBLE") return "INELIGIBLE";
    return "UNAVAILABLE";
  }

  const eligibility = await checkDirectoryEligibility(andrewID);
  const ttl =
    eligibility === "UNAVAILABLE"
      ? DIRECTORY_UNAVAILABLE_TTL_MS
      : DIRECTORY_CHECK_TTL_MS;

  await db.user.update({
    where: { id: userId },
    data: {
      directoryEligibility: eligibility,
      directoryCheckedAt: now,
      directoryCheckExpiresAt: new Date(now.getTime() + ttl),
    },
  });

  return eligibility;
}
