-- AlterTable
ALTER TABLE "User" ADD COLUMN "oidc_subject" TEXT;

-- keep existing users linked to their Keycloak identity
UPDATE "User" AS u
SET "oidc_subject" = a."accountId"
FROM "Account" AS a
WHERE a."userId" = u."id" AND a."providerId" = 'keycloak';

-- CreateIndex
CREATE UNIQUE INDEX "User_oidc_subject_key" ON "User"("oidc_subject");

-- sessions now store sha256 token hashes, so raw tokens never match
DELETE FROM "Session";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Verification";
