CREATE TYPE "DirectoryEligibility" AS ENUM (
  'UNCHECKED',
  'ELIGIBLE',
  'INELIGIBLE',
  'UNAVAILABLE'
);

ALTER TABLE "User"
  ADD COLUMN "directoryEligibility" "DirectoryEligibility" NOT NULL DEFAULT 'UNCHECKED',
  ADD COLUMN "directoryCheckedAt" TIMESTAMPTZ(3),
  ADD COLUMN "directoryCheckExpiresAt" TIMESTAMPTZ(3);

CREATE INDEX "User_directoryEligibility_directoryCheckExpiresAt_idx"
  ON "User"("directoryEligibility", "directoryCheckExpiresAt");
