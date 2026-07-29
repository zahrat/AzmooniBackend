import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/enums';
import { SeedBook, seedBooks } from './seed-data';

const validOptions = new Set(['A', 'B', 'C', 'D']);

interface AdminSeedConfig {
  email: string;
  name: string;
  password: string;
}

function getAdminSeedConfig(): AdminSeedConfig | null {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email && !password) {
    return null;
  }

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must both be set to seed an admin',
    );
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  }

  return {
    email,
    password,
    name: process.env.ADMIN_NAME?.trim() || 'Admin',
  };
}

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
  const adminConfig = getAdminSeedConfig();

  if (process.argv.includes('--dry-run')) {
    console.log(
      `Seed data is valid: ${seedBooks.length} books and ${seedBooks.reduce(
        (count, book) => count + book.questions.length,
        0,
      )} questions.`,
    );
    console.log(
      adminConfig
        ? `Admin seed configuration is valid for ${adminConfig.email}.`
        : 'Admin seed skipped: ADMIN_EMAIL and ADMIN_PASSWORD are not set.',
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
    const adminPasswordHash = adminConfig
      ? await bcrypt.hash(adminConfig.password, 12)
      : null;

    await prisma.$transaction(async (transaction) => {
      if (adminConfig && adminPasswordHash) {
        await transaction.user.upsert({
          where: { email: adminConfig.email },
          create: {
            email: adminConfig.email,
            name: adminConfig.name,
            password: adminPasswordHash,
            role: UserRole.ADMIN,
          },
          update: {
            name: adminConfig.name,
            role: UserRole.ADMIN,
          },
        });
      }

      for (const { questions, ...bookData } of seedBooks) {
        const book = await transaction.book.upsert({
          where: { title: bookData.title },
          create: bookData,
          update: { description: bookData.description },
        });

        const chapter = await transaction.chapter.upsert({
          where: {
            bookId_order: {
              bookId: book.id,
              order: 1,
            },
          },
          create: {
            bookId: book.id,
            title: 'General',
            order: 1,
          },
          update: {},
        });

        for (const question of questions) {
          const existingQuestion = await transaction.question.findFirst({
            where: {
              chapter: { bookId: book.id },
              text: question.text,
            },
            select: { id: true },
          });

          if (existingQuestion) {
            await transaction.question.update({
              where: { id: existingQuestion.id },
              data: { ...question, chapterId: chapter.id },
            });
          } else {
            const chapterWithAllocatedOrder = await transaction.chapter.update({
              where: { id: chapter.id },
              data: {
                nextQuestionOrder: { increment: 1 },
              },
              select: { nextQuestionOrder: true },
            });

            await transaction.question.create({
              data: {
                ...question,
                chapterId: chapter.id,
                order: chapterWithAllocatedOrder.nextQuestionOrder - 1,
              },
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
    if (adminConfig) {
      console.log(`Admin account is ready: ${adminConfig.email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
