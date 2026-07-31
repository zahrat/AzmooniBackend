ALTER TABLE "Book"
DROP CONSTRAINT IF EXISTS "Book_paid_price_check";

ALTER TABLE "Book"
DROP COLUMN "isPaid";

ALTER TABLE "Book"
ADD CONSTRAINT "Book_price_positive_check"
CHECK ("priceToman" IS NOT NULL AND "priceToman" > 0) NOT VALID;
