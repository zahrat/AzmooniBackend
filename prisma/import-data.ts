import 'dotenv/config';
import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Book, Chapter, PrismaClient } from '../generated/prisma/client';
import {
  IMPORT_SHEET_NAME,
  ImportPlan,
  ImportQuestion,
  ImportValidationError,
  parseExcelImport,
} from '../src/import/excel-import';

interface CliOptions {
  apply: boolean;
  confirmDatabase: string | null;
  filePath: string;
  imagesDirectory: string | null;
  sheetName: string;
  uploadsDirectory: string;
}

interface ImportSummary {
  booksCreated: number;
  booksUpdated: number;
  booksUnchanged: number;
  chaptersCreated: number;
  chaptersUpdated: number;
  chaptersUnchanged: number;
  questionsCreated: number;
  questionsUpdated: number;
  questionsUnchanged: number;
}

interface PreparedImages {
  byFileName: Map<
    string,
    { sourcePath: string; url: string; outputPath: string }
  >;
}

const IMAGE_SIGNATURES = {
  '.jpg': (buffer: Buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  '.jpeg': (buffer: Buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  '.png': (buffer: Buffer) =>
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.gif': (buffer: Buffer) =>
    buffer.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
  '.webp': (buffer: Buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP',
} as const;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_WORKBOOK_BYTES = 25 * 1024 * 1024;

function usage(): string {
  return `
Usage:
  npm run import:data -- <file.xlsx> [options]

Default mode is validation only and never writes to the database.

Options:
  --apply                    Import into the database.
  --confirm-database <name>  Required with --apply; must match DATABASE_URL.
  --sheet <name>             Sheet to read (default: ${IMPORT_SHEET_NAME}).
  --images-dir <path>        Directory containing files from imageFile.
  --uploads-dir <path>       Image output directory
                             (default: uploads/questions/imports).
  --help                     Show this help.

Examples:
  npm run import:data -- ./data/questions.xlsx
  npm run import:data -- ./data/questions.xlsx --images-dir ./data/images
  npm run import:data -- ./data/questions.xlsx --apply \\
    --confirm-database app_staging --images-dir ./data/images
`.trim();
}

function requireOptionValue(
  args: string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function parseCliOptions(args: string[]): CliOptions {
  if (args.includes('--help')) {
    console.log(usage());
    process.exit(0);
  }

  let apply = false;
  let confirmDatabase: string | null = null;
  let filePath: string | null = null;
  let imagesDirectory: string | null = null;
  let sheetName = IMPORT_SHEET_NAME;
  let uploadsDirectory = join(process.cwd(), 'uploads', 'questions', 'imports');

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (argument === '--apply') {
      apply = true;
    } else if (argument === '--confirm-database') {
      confirmDatabase = requireOptionValue(args, index, argument);
      index++;
    } else if (argument === '--sheet') {
      sheetName = requireOptionValue(args, index, argument);
      index++;
    } else if (argument === '--images-dir') {
      imagesDirectory = resolve(requireOptionValue(args, index, argument));
      index++;
    } else if (argument === '--uploads-dir') {
      uploadsDirectory = resolve(requireOptionValue(args, index, argument));
      index++;
    } else if (argument.startsWith('--')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (filePath === null) {
      filePath = resolve(argument);
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }

  if (!filePath) {
    throw new Error(`Excel file path is required.\n\n${usage()}`);
  }
  if (extname(filePath).toLowerCase() !== '.xlsx') {
    throw new Error('The import file must use the .xlsx extension.');
  }
  if (apply && !confirmDatabase) {
    throw new Error('--confirm-database is required with --apply.');
  }

  return {
    apply,
    confirmDatabase,
    filePath,
    imagesDirectory,
    sheetName,
    uploadsDirectory,
  };
}

async function assertFileExists(
  filePath: string,
  label: string,
): Promise<void> {
  let fileStat: Stats;
  try {
    fileStat = await stat(filePath);
  } catch {
    throw new Error(`${label} was not found: ${filePath}`);
  }
  if (!fileStat.isFile()) {
    throw new Error(`${label} is not a file: ${filePath}`);
  }
  if (label === 'Excel workbook' && fileStat.size > MAX_WORKBOOK_BYTES) {
    throw new Error('Excel workbook cannot be larger than 25 MB.');
  }
}

function uniqueImageFiles(plan: ImportPlan): string[] {
  return [
    ...new Set(
      plan.books.flatMap((book) =>
        book.chapters.flatMap((chapter) =>
          chapter.questions.flatMap((question) =>
            question.imageFile ? [question.imageFile] : [],
          ),
        ),
      ),
    ),
  ];
}

async function prepareImages(
  plan: ImportPlan,
  options: CliOptions,
): Promise<PreparedImages> {
  const imageFiles = uniqueImageFiles(plan);
  if (imageFiles.length > 0 && !options.imagesDirectory) {
    throw new Error(
      `The workbook references ${imageFiles.length} image file(s); provide --images-dir.`,
    );
  }

  const byFileName = new Map<
    string,
    { sourcePath: string; url: string; outputPath: string }
  >();

  for (const fileName of imageFiles) {
    if (basename(fileName) !== fileName) {
      throw new Error(`Invalid image file name: ${fileName}`);
    }

    const sourcePath = join(options.imagesDirectory!, fileName);
    await assertFileExists(sourcePath, `Image "${fileName}"`);
    const buffer = await readFile(sourcePath);
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image "${fileName}" cannot be larger than 5 MB.`);
    }
    const sourceExtension = extname(fileName).toLowerCase();
    const matchesSignature =
      IMAGE_SIGNATURES[sourceExtension as keyof typeof IMAGE_SIGNATURES];

    if (!matchesSignature || !matchesSignature(buffer)) {
      throw new Error(
        `Image "${fileName}" content does not match its supported extension.`,
      );
    }

    const extension = sourceExtension === '.jpeg' ? '.jpg' : sourceExtension;
    const hash = createHash('sha256').update(buffer).digest('hex');
    const outputFileName = `${hash}${extension}`;
    byFileName.set(fileName, {
      sourcePath,
      outputPath: join(options.uploadsDirectory, outputFileName),
      url: `/uploads/questions/imports/${outputFileName}`,
    });
  }

  return { byFileName };
}

async function writePreparedImages(images: PreparedImages): Promise<void> {
  if (images.byFileName.size === 0) return;

  const firstImage = images.byFileName.values().next().value as
    | { outputPath: string }
    | undefined;
  if (!firstImage) return;

  await mkdir(dirname(firstImage.outputPath), { recursive: true });

  for (const image of images.byFileName.values()) {
    const buffer = await readFile(image.sourcePath);
    try {
      await writeFile(image.outputPath, buffer, { flag: 'wx' });
    } catch (error) {
      const fileError = error as NodeJS.ErrnoException;
      if (fileError.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

function databaseIdentity(connectionString: string): {
  database: string;
  host: string;
  user: string;
} {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) {
    throw new Error('DATABASE_URL does not contain a database name.');
  }
  return {
    database,
    host: url.hostname,
    user: decodeURIComponent(url.username),
  };
}

function sameNullable(left: string | null, right: string | null): boolean {
  return left === right;
}

function questionData(question: ImportQuestion, imageUrl: string | undefined) {
  return {
    text: question.text,
    source: question.source,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctOption: question.correctOption,
    ...(imageUrl ? { imageUrl } : {}),
  };
}

async function applyImport(
  plan: ImportPlan,
  images: PreparedImages,
  connectionString: string,
): Promise<ImportSummary> {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const summary: ImportSummary = {
    booksCreated: 0,
    booksUpdated: 0,
    booksUnchanged: 0,
    chaptersCreated: 0,
    chaptersUpdated: 0,
    chaptersUnchanged: 0,
    questionsCreated: 0,
    questionsUpdated: 0,
    questionsUnchanged: 0,
  };

  try {
    return await prisma.$transaction(
      async (transaction) => {
        for (const bookInput of plan.books) {
          const existingBook = await transaction.book.findUnique({
            where: { title: bookInput.title },
          });

          let book: Book;
          if (!existingBook) {
            book = await transaction.book.create({
              data: {
                title: bookInput.title,
                description: bookInput.description,
                priceToman: bookInput.priceToman,
              },
            });
            summary.booksCreated++;
          } else if (
            !sameNullable(existingBook.description, bookInput.description) ||
            existingBook.priceToman !== bookInput.priceToman
          ) {
            book = await transaction.book.update({
              where: { id: existingBook.id },
              data: {
                description: bookInput.description,
                priceToman: bookInput.priceToman,
              },
            });
            summary.booksUpdated++;
          } else {
            book = existingBook;
            summary.booksUnchanged++;
          }

          for (const chapterInput of bookInput.chapters) {
            const existingChapter = await transaction.chapter.findUnique({
              where: {
                bookId_order: {
                  bookId: book.id,
                  order: chapterInput.order,
                },
              },
            });

            let chapter: Chapter;
            if (!existingChapter) {
              chapter = await transaction.chapter.create({
                data: {
                  bookId: book.id,
                  title: chapterInput.title,
                  order: chapterInput.order,
                  isFree: chapterInput.isFree,
                },
              });
              summary.chaptersCreated++;
            } else if (
              existingChapter.title !== chapterInput.title ||
              existingChapter.isFree !== chapterInput.isFree
            ) {
              chapter = await transaction.chapter.update({
                where: { id: existingChapter.id },
                data: {
                  title: chapterInput.title,
                  isFree: chapterInput.isFree,
                },
              });
              summary.chaptersUpdated++;
            } else {
              chapter = existingChapter;
              summary.chaptersUnchanged++;
            }

            const existingQuestions = await transaction.question.findMany({
              where: { chapterId: chapter.id },
              orderBy: { id: 'asc' },
            });
            const questionsByText = new Map(
              existingQuestions.map((question) => [question.text, question]),
            );
            if (questionsByText.size !== existingQuestions.length) {
              throw new Error(
                `Database contains duplicate question text in "${book.title}" / "${chapter.title}".`,
              );
            }

            for (const inputQuestion of chapterInput.questions) {
              const imageUrl = inputQuestion.imageFile
                ? images.byFileName.get(inputQuestion.imageFile)?.url
                : undefined;
              const data = questionData(inputQuestion, imageUrl);
              const existingQuestion = questionsByText.get(inputQuestion.text);

              if (!existingQuestion) {
                const allocatedOrder = await transaction.chapter.update({
                  where: { id: chapter.id },
                  data: { nextQuestionOrder: { increment: 1 } },
                  select: { nextQuestionOrder: true },
                });
                const created = await transaction.question.create({
                  data: {
                    chapterId: chapter.id,
                    order: allocatedOrder.nextQuestionOrder - 1,
                    ...data,
                  },
                });
                questionsByText.set(created.text, created);
                summary.questionsCreated++;
                continue;
              }

              const changed =
                !sameNullable(existingQuestion.source, inputQuestion.source) ||
                existingQuestion.optionA !== inputQuestion.optionA ||
                existingQuestion.optionB !== inputQuestion.optionB ||
                existingQuestion.optionC !== inputQuestion.optionC ||
                existingQuestion.optionD !== inputQuestion.optionD ||
                existingQuestion.correctOption !==
                  inputQuestion.correctOption ||
                (imageUrl !== undefined &&
                  existingQuestion.imageUrl !== imageUrl);

              if (changed) {
                const updated = await transaction.question.update({
                  where: { id: existingQuestion.id },
                  data,
                });
                questionsByText.set(updated.text, updated);
                summary.questionsUpdated++;
              } else {
                summary.questionsUnchanged++;
              }
            }
          }
        }

        return summary;
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  } finally {
    await prisma.$disconnect();
  }
}

function printPlan(plan: ImportPlan, options: CliOptions): void {
  console.log(`Workbook: ${options.filePath}`);
  console.log(`Sheet: ${options.sheetName}`);
  console.log(
    `Validated: ${plan.books.length} book(s), ${plan.chapterCount} chapter(s), ` +
      `${plan.questionCount} question(s), ${plan.imageCount} image reference(s).`,
  );
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  await assertFileExists(options.filePath, 'Excel workbook');

  const plan = await parseExcelImport(options.filePath, options.sheetName);
  const images = await prepareImages(plan, options);
  printPlan(plan, options);

  if (!options.apply) {
    console.log(
      'Dry run completed successfully. No database changes were made.',
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required with --apply.');
  }

  const identity = databaseIdentity(connectionString);
  if (identity.database !== options.confirmDatabase) {
    throw new Error(
      `Database confirmation failed: DATABASE_URL points to "${identity.database}", ` +
        `but --confirm-database was "${options.confirmDatabase}".`,
    );
  }

  console.log(
    `Confirmed database: ${identity.database} on ${identity.host} as ${identity.user}.`,
  );
  await writePreparedImages(images);
  const summary = await applyImport(plan, images, connectionString);

  console.log('Import completed successfully:');
  console.log(
    `  Books: ${summary.booksCreated} created, ${summary.booksUpdated} updated, ` +
      `${summary.booksUnchanged} unchanged.`,
  );
  console.log(
    `  Chapters: ${summary.chaptersCreated} created, ${summary.chaptersUpdated} updated, ` +
      `${summary.chaptersUnchanged} unchanged.`,
  );
  console.log(
    `  Questions: ${summary.questionsCreated} created, ` +
      `${summary.questionsUpdated} updated, ${summary.questionsUnchanged} unchanged.`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof ImportValidationError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
