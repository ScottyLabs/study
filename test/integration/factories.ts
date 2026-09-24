import type { DirectoryEligibility } from "@prisma/client";
import { db } from "~/server/db";

let sequence = 0;

export async function createTestUser({
  id,
  email,
  name = "Test User",
  eligibility = "ELIGIBLE",
}: {
  id?: string;
  email?: string;
  name?: string;
  eligibility?: DirectoryEligibility;
} = {}) {
  sequence += 1;
  const suffix = `${Date.now()}-${sequence}`;
  const userId = id ?? `user-${suffix}`;
  const userEmail = email ?? `user-${suffix}@example.edu`;

  return db.user.create({
    data: {
      id: userId,
      email: userEmail,
      name,
      andrewID: userId,
      directoryEligibility: eligibility,
      directoryCheckExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
}

export async function createTestGroup({
  ownerId,
  totalSeats = 3,
}: {
  ownerId: string;
  totalSeats?: number;
}) {
  const group = await db.studyGroup.create({
    data: {
      courseCode: "15-112",
      title: "Join pipeline group",
      purpose: "Prepare for the exam",
      details: "Bring practice problems.",
      location: "Hunt Library",
      startTime: new Date("2030-01-01T15:00:00.000Z"),
      totalSeats,
    },
  });

  await db.groupMembership.create({
    data: { groupId: group.id, userId: ownerId, calendarEventId: "owner-event" },
  });

  return group;
}
