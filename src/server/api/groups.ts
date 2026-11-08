import { Prisma } from "@prisma/client";

import { db } from "~/server/db";

type GroupInput = {
  courseCode: string;
  title: string;
  purpose: string;
  details: string;
  location: string;
  startTime: Date;
  totalSeats: number;
  calendarEventId?: string;
};

const groupInclude = {
  memberships: {
    orderBy: { joinedAt: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
};

function serializeGroup<
  Group extends {
    memberships: Array<{
      calendarEventId: string | null;
      user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
      };
    }>;
  },
>(group: Group) {
  const { memberships, ...groupData } = group;

  return {
    ...groupData,
    participants: memberships.map(({ user, calendarEventId }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      url: user.image,
      eventId: calendarEventId,
    })),
  };
}

export async function listGroups(courseCode?: string) {
  const groups = await db.studyGroup.findMany({
    where: courseCode === undefined || courseCode === "" ? {} : { courseCode },
    orderBy: { startTime: "asc" },
    include: groupInclude,
  });

  return groups.map((group) => serializeGroup(group));
}

export async function getGroup(groupId: string) {
  const group = await db.studyGroup.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });

  return group ? serializeGroup(group) : null;
}

export async function createGroup(input: GroupInput, userId: string) {
  const { calendarEventId, ...groupInput } = input;
  const group = await db.$transaction(async (transaction) => {
    const createdGroup = await transaction.studyGroup.create({
      data: groupInput,
    });

    await transaction.groupMembership.create({
      data: {
        groupId: createdGroup.id,
        userId,
        calendarEventId,
      },
    });

    return transaction.studyGroup.findUniqueOrThrow({
      where: { id: createdGroup.id },
      include: groupInclude,
    });
  });

  return serializeGroup(group);
}

export async function updateGroup(groupId: string, userId: string, input: GroupInput) {
  const { calendarEventId: _calendarEventId, ...groupInput } = input;
  const membership = await db.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) return null;

  const group = await db.studyGroup.update({
    where: { id: groupId },
    data: groupInput,
    include: groupInclude,
  });

  return serializeGroup(group);
}

export function joinGroup(groupId: string, userId: string, calendarEventId?: string) {
  return db.$transaction(
    async (transaction) => {
      const group = await transaction.studyGroup.findUnique({
        where: { id: groupId },
        select: { id: true, totalSeats: true },
      });

      if (!group) return { kind: "missing" as const };

      const existingMembership = await transaction.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });

      if (existingMembership) return { kind: "already_joined" as const };

      const groupMemberIds = await findGroupMemberIds(transaction, groupId);
      const blockedRelationship = await transaction.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: { in: groupMemberIds } },
            { blockedId: userId, blockerId: { in: groupMemberIds } },
          ],
        },
        select: { blockerId: true },
      });

      if (blockedRelationship) return { kind: "blocked" as const };

      const memberCount = await transaction.groupMembership.count({
        where: { groupId },
      });

      if (memberCount >= group.totalSeats) return { kind: "full" as const };

      await transaction.groupMembership.create({
        data: { groupId, userId, calendarEventId },
      });

      return { kind: "joined" as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function findGroupMemberIds(transaction: Prisma.TransactionClient, groupId: string) {
  const members = await transaction.groupMembership.findMany({
    where: { groupId },
    select: { userId: true },
  });

  return members.map(({ userId }) => userId);
}

export function leaveGroup(groupId: string, userId: string) {
  return db.$transaction(async (transaction) => {
    const membership = await transaction.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) return { left: false, emptied: false };

    await transaction.groupMembership.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    const remainingMembers = await transaction.groupMembership.count({
      where: { groupId },
    });

    if (remainingMembers === 0) {
      await transaction.studyGroup.delete({ where: { id: groupId } });
    }

    return { left: true, emptied: remainingMembers === 0 };
  });
}
