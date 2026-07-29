CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELED'
);

ALTER TABLE "Book"
ADD COLUMN "priceToman" INTEGER;

CREATE TABLE "Payment" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "bookId" INTEGER NOT NULL,
  "amountToman" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "authority" TEXT,
  "refId" TEXT,
  "cardPan" TEXT,
  "cardHash" TEXT,
  "feeToman" INTEGER,
  "failureCode" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_authority_key" ON "Payment"("authority");
CREATE UNIQUE INDEX "Payment_refId_key" ON "Payment"("refId");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_bookId_status_idx" ON "Payment"("bookId", "status");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
