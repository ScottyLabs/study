import { describe, expect, test, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    block: { findMany: vi.fn() },
    groupMembership: { findMany: vi.fn() },
  },
}));

vi.mock("~/server/db", () => ({ db }));

import { getBlockingState } from "./profile";

describe("getBlockingState", () => {
  test("returns only memberships for upcoming groups", async () => {
    db.block.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    db.groupMembership.findMany.mockResolvedValue([{ groupId: "upcoming" }]);

    await expect(getBlockingState("student-id")).resolves.toEqual({
      blockedByMe: [],
      blockedByThem: [],
      joinedGroups: ["upcoming"],
    });

    expect(db.groupMembership.findMany).toHaveBeenCalledWith({
      where: {
        userId: "student-id",
        group: { startTime: { gte: expect.any(Date) } },
      },
      select: { groupId: true },
    });
  });
});
