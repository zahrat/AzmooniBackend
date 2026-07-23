-- CreateTable
CREATE TABLE "FavoriteQuestion" (
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteQuestion_pkey" PRIMARY KEY ("userId","questionId")
);

-- AddForeignKey
ALTER TABLE "FavoriteQuestion" ADD CONSTRAINT "FavoriteQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteQuestion" ADD CONSTRAINT "FavoriteQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
