CREATE TABLE "Chapter" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Chapter_bookId_order_key"
ON "Chapter"("bookId", "order");

ALTER TABLE "Chapter"
ADD CONSTRAINT "Chapter_order_positive" CHECK ("order" > 0);

ALTER TABLE "Chapter"
ADD CONSTRAINT "Chapter_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Question"
ADD COLUMN "chapterId" INTEGER;

-- Preserve existing questions by creating one default chapter per book.
INSERT INTO "Chapter" ("bookId", "title", "order")
SELECT "id", 'General', 1
FROM "Book";

UPDATE "Question"
SET "chapterId" = "Chapter"."id"
FROM "Chapter"
WHERE "Chapter"."bookId" = "Question"."bookId"
  AND "Chapter"."order" = 1;

ALTER TABLE "Question"
ALTER COLUMN "chapterId" SET NOT NULL;

ALTER TABLE "Question"
DROP CONSTRAINT "Question_bookId_fkey";

ALTER TABLE "Question"
DROP COLUMN "bookId";

ALTER TABLE "Question"
ADD CONSTRAINT "Question_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
