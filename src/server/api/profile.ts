import { Prisma } from "@prisma/client";

import { db } from "~/server/db";

type GroupMembershipClient = Pick<Prisma.TransactionClient, "groupMembership">;

async function getSharedMemberships(
  client: GroupMembershipClient,
  userId: string,
  targetUserId: string,
) {
  const [currentMemberships, targetMemberships] = await Promise.all([
    client.groupMembership.findMany({
      where: { userId },
      select: { groupId: true, calendarEventId: true },
    }),
    client.groupMembership.findMany({
      where: { userId: targetUserId },
      select: { groupId: true },
    }),
  ]);
  const targetGroupIds = new Set(
    targetMemberships.map(({ groupId }) => groupId),
  );

  return currentMemberships.filter(({ groupId }) =>
    targetGroupIds.has(groupId),
  );
}

export async function getProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      academicYear: true,
      majors: true,
      minors: true,
      theme: true,
      courseCodes: true,
    },
  });

  return {
    year: user?.academicYear ?? "default",
    majors: user?.majors ?? "",
    minors: user?.minors ?? "",
    theme: user?.theme.toLowerCase() === "dark" ? "dark" : "light",
    courseCodes: user?.courseCodes ?? [],
  } as const;
}

export async function updateProfile(
  userId: string,
  updates: { year?: string; majors?: string; minors?: string },
) {
  await db.user.update({
    where: { id: userId },
    data: {
      academicYear: updates.year,
      majors: updates.majors,
      minors: updates.minors,
    },
  });

  return getProfile(userId);
}

export async function updateTheme(userId: string, theme: "light" | "dark") {
  await db.user.update({
    where: { id: userId },
    data: { theme: theme.toUpperCase() as "LIGHT" | "DARK" },
  });
}

export async function getCourseCodes(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { courseCodes: true },
  });

  return user?.courseCodes ?? [];
}

export async function addCourseCode(userId: string, courseCode: string) {
  await db.$executeRaw`
    UPDATE "User"
    SET "courseCodes" = array_append("courseCodes", ${courseCode})
    WHERE "id" = ${userId}
      AND NOT (${courseCode} = ANY("courseCodes"))
  `;
}

export async function deleteCourseCode(userId: string, courseCode: string) {
  await db.$executeRaw`
    UPDATE "User"
    SET "courseCodes" = array_remove("courseCodes", ${courseCode})
    WHERE "id" = ${userId}
      AND ${courseCode} = ANY("courseCodes")
  `;
}

export async function getBlockingState(userId: string) {
  const [createdBlocks, receivedBlocks, memberships] = await Promise.all([
    db.block.findMany({
      where: { blockerId: userId },
      select: { blockedEmail: true },
    }),
    db.block.findMany({
      where: { blockedId: userId },
      select: { blocker: { select: { email: true } } },
    }),
    db.groupMembership.findMany({
      where: {
        userId,
        group: { startTime: { gte: new Date() } },
      },
      select: { groupId: true },
    }),
  ]);

  return {
    blockedByMe: createdBlocks.map(({ blockedEmail }) => blockedEmail),
    blockedByThem: receivedBlocks.map(({ blocker }) => blocker.email),
    joinedGroups: memberships.map(({ groupId }) => groupId),
  };
}

export async function blockUser(userId: string, targetEmail: string) {
  return db.$transaction(
    async (transaction) => {
      const [blocker, target] = await Promise.all([
        transaction.user.findUnique({
          where: { id: userId },
          select: { email: true },
        }),
        transaction.user.findUnique({
          where: { email: targetEmail },
          select: { id: true },
        }),
      ]);

      if (!blocker) return { kind: "missing_blocker" as const };
      if (
        target?.id === userId ||
        blocker.email.toLowerCase() === targetEmail.toLowerCase()
      ) {
        return { kind: "self" as const };
      }

      await transaction.block.upsert({
        where: {
          blockerId_blockedEmail: {
            blockerId: userId,
            blockedEmail: targetEmail,
          },
        },
        create: {
          blockerId: userId,
          blockedEmail: targetEmail,
          blockedId: target?.id,
        },
        update: { blockedId: target?.id },
      });

      if (!target) {
        return {
          kind: "blocked" as const,
          calendarEventIds: [],
        };
      }

      const sharedMemberships = await getSharedMemberships(
        transaction,
        userId,
        target.id,
      );

      if (sharedMemberships.length > 0) {
        await transaction.groupMembership.deleteMany({
          where: {
            userId,
            groupId: { in: sharedMemberships.map(({ groupId }) => groupId) },
          },
        });

        for (const { groupId } of sharedMemberships) {
          const remainingMembers = await transaction.groupMembership.count({
            where: { groupId },
          });
          if (remainingMembers === 0) {
            await transaction.studyGroup.delete({ where: { id: groupId } });
          }
        }
      }

      return {
        kind: "blocked" as const,
        calendarEventIds: sharedMemberships
          .map(({ calendarEventId }) => calendarEventId)
          .filter((calendarEventId): calendarEventId is string =>
            Boolean(calendarEventId),
          ),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getBlockImpact(userId: string, targetEmail: string) {
  const target = await db.user.findUnique({
    where: { email: targetEmail },
    select: { id: true },
  });

  if (!target) return { sharedGroupCount: 0 };

  const sharedMemberships = await getSharedMemberships(db, userId, target.id);

  return {
    sharedGroupCount: sharedMemberships.length,
  };
}

export async function unblockUser(userId: string, targetEmail: string) {
  const result = await db.block.deleteMany({
    where: { blockerId: userId, blockedEmail: targetEmail },
  });

  return result.count > 0;
}

export async function attachPendingBlocks(userId: string, email: string) {
  await db.block.updateMany({
    where: { blockedEmail: email, blockedId: null },
    data: { blockedId: userId },
  });
}
