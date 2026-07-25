-- Store only a hash of the latest refresh token so it can be rotated safely.
ALTER TABLE "User" ADD COLUMN "refreshTokenHash" TEXT;
