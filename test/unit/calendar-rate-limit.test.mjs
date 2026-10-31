// @vitest-environment node

import assert from "node:assert/strict";
import { test } from "vitest";
import { typescriptLoader } from "../load-typescript.mjs";

const { createBusyLimiter } = typescriptLoader()(
  "src/server/calendar/rateLimit.ts",
);
const busy = [{ start: "2026-11-02T15:00:00Z", end: "2026-11-02T16:00:00Z" }];
const minute = 60_000;

test("each user is limited per minute and recovers in the next minute", () => {
  const limiter = createBusyLimiter({ perUser: 2, global: 100 });
  assert.equal(limiter.acquire("student-1", 0), true);
  assert.equal(limiter.acquire("student-1", 1), true);
  assert.equal(limiter.acquire("student-1", 2), false);
  assert.equal(limiter.acquire("student-2", 3), true);
  assert.equal(limiter.acquire("student-1", minute), true);
});

test("the global cap blocks every user once reached", () => {
  const limiter = createBusyLimiter({ perUser: 10, global: 2 });
  assert.equal(limiter.acquire("student-1", 0), true);
  assert.equal(limiter.acquire("student-2", 0), true);
  assert.equal(limiter.acquire("student-3", 0), false);
});

test("a cached result is reused only for the same user, a covered range, and one minute", () => {
  const limiter = createBusyLimiter();
  limiter.store("student-1", 1_000, 5_000, busy, 0);
  assert.deepEqual(limiter.cached("student-1", 2_000, 4_000, 1), busy);
  assert.equal(limiter.cached("student-2", 2_000, 4_000, 1), null);
  assert.equal(limiter.cached("student-1", 0, 4_000, 1), null);
  assert.equal(limiter.cached("student-1", 2_000, 6_000, 1), null);
  assert.equal(limiter.cached("student-1", 2_000, 4_000, minute), null);
});
