import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

declare global {
  // Keep one client across Next.js dev reloads, which re-evaluate this module
  var studyPrisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    log: env.PRISMA_QUERY_LOG ? ["query", "error", "warn"] : ["error", "warn"],
  });

export const db = globalThis.studyPrisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalThis.studyPrisma = db;
