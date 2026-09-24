// @vitest-environment node

import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "~/server/db";
import {
  disconnectTestDatabase,
  integrationDatabaseConfigured,
  resetTestDatabase,
} from "./database";
import { createTestGroup, createTestUser } from "./factories";

const authMocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("~/lib/auth", () => ({
  auth: { api: { getSession: authMocks.getSession } },
}));
vi.mock("~/server/eligibility/service", () => ({
  getUserEligibility: vi.fn(async () => "ELIGIBLE"),
}));

import { api } from "~/server/api/app";

const integrationTest = integrationDatabaseConfigured ? test : test.skip;

function requestJoin(groupId: string, body: Record<string, unknown> = {}) {
  return api.fetch(
    new Request(`http://localhost/api/v1/groups/${groupId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/v1/groups/:groupId/join", () => {
  beforeEach(resetTestDatabase);
  afterEach(resetTestDatabase);
  afterAll(disconnectTestDatabase);

  integrationTest("returns success and persists the authenticated user's membership", async () => {
    const owner = await createTestUser({ id: "owner", email: "owner@example.edu" });
    const joiner = await createTestUser({ id: "joiner", email: "joiner@example.edu" });
    const group = await createTestGroup({ ownerId: owner.id });
    authMocks.getSession.mockResolvedValue({
      user: { id: joiner.id, andrewID: joiner.andrewID },
    });

    const response = await requestJoin(group.id, {
      calendarEventId: "joiner-calendar-event",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ joined: true });
    await expect(
      db.groupMembership.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: joiner.id } },
      }),
    ).resolves.toMatchObject({ calendarEventId: "joiner-calendar-event" });
  });

  integrationTest("maps missing, duplicate, full, and unauthenticated joins to HTTP errors", async () => {
    const owner = await createTestUser({ id: "owner", email: "owner@example.edu" });
    const joiner = await createTestUser({ id: "joiner", email: "joiner@example.edu" });
    const group = await createTestGroup({ ownerId: owner.id, totalSeats: 2 });
    authMocks.getSession.mockResolvedValue({
      user: { id: joiner.id, andrewID: joiner.andrewID },
    });

    expect((await requestJoin("does-not-exist")).status).toBe(404);

    expect((await requestJoin(group.id)).status).toBe(200);
    expect((await requestJoin(group.id)).status).toBe(409);

    const otherJoiner = await createTestUser({ id: "other", email: "other@example.edu" });
    const fullGroup = await createTestGroup({ ownerId: owner.id, totalSeats: 1 });
    authMocks.getSession.mockResolvedValue({
      user: { id: otherJoiner.id, andrewID: otherJoiner.andrewID },
    });
    expect((await requestJoin(fullGroup.id)).status).toBe(409);

    authMocks.getSession.mockResolvedValue(null);
    expect((await requestJoin(group.id)).status).toBe(401);
  });
});
