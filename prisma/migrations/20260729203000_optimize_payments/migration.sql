ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';

ALTER TABLE "Payment"
ADD COLUMN "paymentUrl" TEXT,
ADD COLUMN "activeKey" TEXT,
ADD COLUMN "verifyAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "Payment"
SET "expiresAt" = "createdAt" + INTERVAL '30 minutes'
WHERE "expiresAt" IS NULL;

ALTER TABLE "Payment"
ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE UNIQUE INDEX "Payment_activeKey_key" ON "Payment"("activeKey");
CREATE INDEX "Payment_userId_bookId_status_expiresAt_idx"
ON "Payment"("userId", "bookId", "status", "expiresAt");

ALTER TABLE "Book"
ADD CONSTRAINT "Book_paid_price_check"
CHECK (
  ("isPaid" = false AND "priceToman" IS NULL)
  OR
  ("isPaid" = true AND "priceToman" IS NOT NULL AND "priceToman" > 0)
) NOT VALID;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_amount_positive_check"
CHECK ("amountToman" > 0) NOT VALID;
