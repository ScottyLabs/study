import { db } from "~/server/db";

export const integrationDatabaseConfigured = Boolean(
  process.env.DATABASE_URL_TEST,
);

export async function resetTestDatabase() {
  if (!integrationDatabaseConfigured) {
    throw new Error("Refusing to reset a database without DATABASE_URL_TEST.");
  }

  await db.$transaction([
    db.block.deleteMany(),
    db.groupMembership.deleteMany(),
    db.studyGroup.deleteMany(),
    db.account.deleteMany(),
    db.session.deleteMany(),
    db.verification.deleteMany(),
    db.user.deleteMany(),
  ]);
}

export async function disconnectTestDatabase() {
  if (integrationDatabaseConfigured) {
    await db.$disconnect();
  }
}
