-- DropIndex
DROP INDEX "User_directoryEligibility_directoryCheckExpiresAt_idx";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "directoryCheckedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "directoryCheckExpiresAt" SET DATA TYPE TIMESTAMP(3);
