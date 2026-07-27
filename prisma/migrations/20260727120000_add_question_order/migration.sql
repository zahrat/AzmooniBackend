-- Add a stable order to questions and a per-chapter allocator for new questions.
ALTER TABLE "Question" ADD COLUMN "order" INTEGER;

WITH "RankedQuestions" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "chapterId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS "questionOrder"
    FROM "Question"
)
UPDATE "Question"
SET "order" = "RankedQuestions"."questionOrder"
FROM "RankedQuestions"
WHERE "Question"."id" = "RankedQuestions"."id";

ALTER TABLE "Question" ALTER COLUMN "order" SET NOT NULL;

CREATE UNIQUE INDEX "Question_chapterId_order_key"
ON "Question"("chapterId", "order");

ALTER TABLE "Question"
ADD CONSTRAINT "Question_order_positive" CHECK ("order" > 0);

ALTER TABLE "Chapter"
ADD COLUMN "nextQuestionOrder" INTEGER NOT NULL DEFAULT 1;

UPDATE "Chapter"
SET "nextQuestionOrder" = COALESCE(
    (
        SELECT MAX("Question"."order") + 1
        FROM "Question"
        WHERE "Question"."chapterId" = "Chapter"."id"
    ),
    1
);

ALTER TABLE "Chapter"
ADD CONSTRAINT "Chapter_nextQuestionOrder_positive"
CHECK ("nextQuestionOrder" > 0);
