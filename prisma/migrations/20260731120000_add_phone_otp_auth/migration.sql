-- Existing email-only accounts cannot be converted to phone accounts reliably.
-- User-owned rows are removed through their ON DELETE CASCADE constraints.
DELETE FROM "User";

ALTER TABLE "User" ADD COLUMN "phone" TEXT NOT NULL;
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

CREATE TABLE "OtpChallenge" (
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("phone")
);
