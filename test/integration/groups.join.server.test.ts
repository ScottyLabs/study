// @vitest-environment node

import { afterAll, afterEach, beforeEach, describe, expect, test } from "vitest";
import { joinGroup } from "~/server/api/groups";
import { db } from "~/server/db";
import {
  disconnectTestDatabase,
  integrationDatabaseConfigured,
  resetTestDatabase,
} from "./database";
import { createTestGroup, createTestUser } from "./factories";

const integrationTest = integrationDatabaseConfigured ? test : test.skip;

describe("groups.joinGroup database transaction", () => {
  beforeEach(resetTestDatabase);
  afterEach(resetTestDatabase);
  afterAll(disconnectTestDatabase);

  integrationTest("creates one membership with the supplied calendar event ID", async () => {
    const owner = await createTestUser({ id: "owner", email: "owner@example.edu" });
    const joiner = await createTestUser({ id: "joiner", email: "joiner@example.edu" });
    const group = await createTestGroup({ ownerId: owner.id });

    await expect(joinGroup(group.id, joiner.id, "joiner-calendar-event")).resolves.toEqual({
      kind: "joined",
    });

    await expect(
      db.groupMembership.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: joiner.id } },
      }),
    ).resolves.toMatchObject({
      groupId: group.id,
      userId: joiner.id,
      calendarEventId: "joiner-calendar-event",
    });
    await expect(db.groupMembership.count({ where: { groupId: group.id } })).resolves.toBe(2);
  });

  integrationTest("rejects duplicate, full, and blocked joins without creating a row", async () => {
    const owner = await createTestUser({ id: "owner", email: "owner@example.edu" });
    const joiner = await createTestUser({ id: "joiner", email: "joiner@example.edu" });
    const group = await createTestGroup({ ownerId: owner.id, totalSeats: 3 });

    await joinGroup(group.id, joiner.id);
    await expect(joinGroup(group.id, joiner.id)).resolves.toEqual({
      kind: "already_joined",
    });

    const fullGroup = await createTestGroup({ ownerId: owner.id, totalSeats: 1 });
    await expect(joinGroup(fullGroup.id, joiner.id)).resolves.toEqual({ kind: "full" });

    const blockedJoiner = await createTestUser({
      id: "blocked-joiner",
      email: "blocked@example.edu",
    });
    await db.block.create({
      data: {
        blockerId: owner.id,
        blockedId: blockedJoiner.id,
        blockedEmail: blockedJoiner.email,
      },
    });
    await expect(joinGroup(group.id, blockedJoiner.id)).resolves.toEqual({
      kind: "blocked",
    });
    await expect(
      db.groupMembership.findUnique({
        where: {
          groupId_userId: { groupId: group.id, userId: blockedJoiner.id },
        },
      }),
    ).resolves.toBeNull();
  });
});
