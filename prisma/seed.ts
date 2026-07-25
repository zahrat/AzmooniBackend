import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { SeedBook, seedBooks } from './seed-data';

const validOptions = new Set(['A', 'B', 'C', 'D']);

function validateSeedData(books: SeedBook[]) {
  if (books.length === 0) {
    throw new Error('Seed data must include at least one book');
  }

  const titles = new Set<string>();

  for (const book of books) {
    if (titles.has(book.title)) {
      throw new Error(`Duplicate book title: ${book.title}`);
    }
    titles.add(book.title);

    if (book.questions.length !== 15) {
      throw new Error(
        `${book.title} must have exactly 15 questions; received ${book.questions.length}`,
      );
    }

    const questionTexts = new Set<string>();
    for (const question of book.questions) {
      if (questionTexts.has(question.text)) {
        throw new Error(
          `Duplicate question in ${book.title}: ${question.text}`,
        );
      }
      questionTexts.add(question.text);

      if (!validOptions.has(question.correctOption)) {
        throw new Error(
          `Invalid correct option in ${book.title}: ${question.correctOption}`,
        );
      }

      if (
        [
          question.text,
          question.optionA,
          question.optionB,
          question.optionC,
          question.optionD,
        ].some((value) => value.trim().length === 0)
      ) {
        throw new Error(`Empty question field found in ${book.title}`);
      }
    }
  }
}

async function seed() {
  validateSeedData(seedBooks);

  if (process.argv.includes('--dry-run')) {
    console.log(
      `Seed data is valid: ${seedBooks.length} books and ${seedBooks.reduce(
        (count, book) => count + book.questions.length,
        0,
      )} questions.`,
    );
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed the database');
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (transaction) => {
      for (const { questions, ...bookData } of seedBooks) {
        const book = await transaction.book.upsert({
          where: { title: bookData.title },
          create: bookData,
          update: { description: bookData.description },
        });

        for (const question of questions) {
          const existingQuestion = await transaction.question.findFirst({
            where: { bookId: book.id, text: question.text },
            select: { id: true },
          });

          if (existingQuestion) {
            await transaction.question.update({
              where: { id: existingQuestion.id },
              data: question,
            });
          } else {
            await transaction.question.create({
              data: { ...question, bookId: book.id },
            });
          }
        }
      }
    });

    console.log(
      `Seed completed: ${seedBooks.length} books and ${seedBooks.reduce(
        (count, book) => count + book.questions.length,
        0,
      )} questions are ready.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
