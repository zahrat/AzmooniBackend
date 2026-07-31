import { extname } from 'node:path';
import {
  CellValue,
  SheetData,
  SheetNotFoundError,
  readSheet,
} from 'read-excel-file/node';

export const IMPORT_SHEET_NAME = 'ورود اطلاعات';

export const IMPORT_HEADERS = [
  'bookTitle',
  'bookDescription',
  'priceToman',
  'chapterTitle',
  'chapterOrder',
  'isFree',
  'questionText',
  'source',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctOption',
  'imageFile',
  'notes',
] as const;

const VALID_IMAGE_EXTENSIONS = new Set([
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
]);

export interface ImportQuestion {
  rowNumber: number;
  text: string;
  source: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  imageFile: string | null;
}

export interface ImportChapter {
  title: string;
  order: number;
  isFree: boolean;
  questions: ImportQuestion[];
}

export interface ImportBook {
  title: string;
  description: string | null;
  priceToman: number;
  chapters: ImportChapter[];
}

export interface ImportPlan {
  books: ImportBook[];
  rowCount: number;
  chapterCount: number;
  questionCount: number;
  imageCount: number;
}

interface ParsedRow {
  rowNumber: number;
  bookTitle: string;
  bookDescription: string | null;
  priceToman: number;
  chapterTitle: string;
  chapterOrder: number;
  isFree: boolean;
  question: ImportQuestion;
}

export class ImportValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(
      `Excel import validation failed with ${errors.length} error${
        errors.length === 1 ? '' : 's'
      }:\n${errors.map((error) => `- ${error}`).join('\n')}`,
    );
    this.name = 'ImportValidationError';
  }
}

function normalizeDigits(value: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

  return [...value]
    .map((character) => {
      const persianIndex = persianDigits.indexOf(character);
      if (persianIndex >= 0) return String(persianIndex);

      const arabicIndex = arabicDigits.indexOf(character);
      if (arabicIndex >= 0) return String(arabicIndex);

      return character;
    })
    .join('');
}

function textValue(value: CellValue | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function optionalText(value: CellValue | null | undefined): string | null {
  const text = textValue(value);
  return text.length === 0 ? null : text;
}

function requiredText(
  value: CellValue | null | undefined,
  rowNumber: number,
  header: string,
  errors: string[],
): string {
  const text = textValue(value);
  if (text.length === 0) {
    errors.push(`Row ${rowNumber}: ${header} is required.`);
  }
  return text;
}

function parseBoolean(
  value: CellValue | null | undefined,
  rowNumber: number,
  header: string,
  errors: string[],
): boolean {
  if (value === true || value === false) {
    return value;
  }

  const normalized = normalizeDigits(textValue(value)).toUpperCase();
  if (
    normalized === '' ||
    normalized === 'FALSE' ||
    normalized === '0' ||
    normalized === 'خیر'
  ) {
    return false;
  }
  if (normalized === 'TRUE' || normalized === '1' || normalized === 'بله') {
    return true;
  }

  errors.push(
    `Row ${rowNumber}: ${header} must be TRUE or FALSE; received "${textValue(
      value,
    )}".`,
  );
  return false;
}

function parseInteger(
  value: CellValue | null | undefined,
  rowNumber: number,
  header: string,
  errors: string[],
  required: boolean,
): number | null {
  const rawValue = textValue(value);
  if (rawValue.length === 0) {
    if (required) {
      errors.push(`Row ${rowNumber}: ${header} is required.`);
    }
    return null;
  }

  const normalized = normalizeDigits(rawValue).replace(/[,\u066c\s]/g, '');
  if (!/^\d+$/.test(normalized)) {
    errors.push(
      `Row ${rowNumber}: ${header} must be a non-negative integer; received "${rawValue}".`,
    );
    return null;
  }

  const integer = Number(normalized);
  if (!Number.isSafeInteger(integer)) {
    errors.push(`Row ${rowNumber}: ${header} is outside the supported range.`);
    return null;
  }

  return integer;
}

function validateHeaders(rows: SheetData): void {
  const headerRow = rows[0] ?? [];
  const errors: string[] = [];

  IMPORT_HEADERS.forEach((expected, index) => {
    const actual = textValue(headerRow[index]);
    if (actual !== expected) {
      errors.push(
        `Column ${index + 1}: expected header "${expected}", received "${
          actual || '(empty)'
        }".`,
      );
    }
  });

  const extraHeaders = headerRow
    .slice(IMPORT_HEADERS.length)
    .map(textValue)
    .filter(Boolean);
  if (extraHeaders.length > 0) {
    errors.push(`Unexpected columns: ${extraHeaders.join(', ')}.`);
  }

  if (errors.length > 0) {
    throw new ImportValidationError(errors);
  }
}

function parseRows(rows: SheetData): ParsedRow[] {
  const parsedRows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 1;

    if (
      row
        .slice(0, IMPORT_HEADERS.length)
        .every((value) => textValue(value).length === 0)
    ) {
      continue;
    }

    const rowErrorsBefore = errors.length;
    const bookTitle = requiredText(row[0], rowNumber, 'bookTitle', errors);
    const bookDescription = optionalText(row[1]);
    const priceToman = parseInteger(
      row[2],
      rowNumber,
      'priceToman',
      errors,
      true,
    );
    const chapterTitle = requiredText(
      row[3],
      rowNumber,
      'chapterTitle',
      errors,
    );
    const chapterOrder = parseInteger(
      row[4],
      rowNumber,
      'chapterOrder',
      errors,
      true,
    );
    const isFree = parseBoolean(row[5], rowNumber, 'isFree', errors);
    const questionText = requiredText(
      row[6],
      rowNumber,
      'questionText',
      errors,
    );
    const source = optionalText(row[7]);
    const optionA = requiredText(row[8], rowNumber, 'optionA', errors);
    const optionB = requiredText(row[9], rowNumber, 'optionB', errors);
    const optionC = requiredText(row[10], rowNumber, 'optionC', errors);
    const optionD = requiredText(row[11], rowNumber, 'optionD', errors);
    const correctOption = textValue(row[12]).toUpperCase();
    const imageFile = optionalText(row[13]);

    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      errors.push(
        `Row ${rowNumber}: correctOption must be A, B, C, or D; received "${
          textValue(row[12]) || '(empty)'
        }".`,
      );
    }
    if (chapterOrder !== null && chapterOrder < 1) {
      errors.push(`Row ${rowNumber}: chapterOrder must be at least 1.`);
    }
    if (priceToman !== null && priceToman <= 0) {
      errors.push(`Row ${rowNumber}: priceToman must be positive.`);
    }
    if (imageFile) {
      if (imageFile.includes('/') || imageFile.includes('\\')) {
        errors.push(
          `Row ${rowNumber}: imageFile must contain only a file name, not a path.`,
        );
      }
      if (!VALID_IMAGE_EXTENSIONS.has(extname(imageFile).toLowerCase())) {
        errors.push(
          `Row ${rowNumber}: imageFile must be JPEG, PNG, GIF, or WebP.`,
        );
      }
    }

    if (
      errors.length === rowErrorsBefore &&
      chapterOrder !== null &&
      priceToman !== null &&
      ['A', 'B', 'C', 'D'].includes(correctOption)
    ) {
      parsedRows.push({
        rowNumber,
        bookTitle,
        bookDescription,
        priceToman,
        chapterTitle,
        chapterOrder,
        isFree,
        question: {
          rowNumber,
          text: questionText,
          source,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption: correctOption as 'A' | 'B' | 'C' | 'D',
          imageFile,
        },
      });
    }
  }

  if (parsedRows.length === 0 && errors.length === 0) {
    errors.push('The import sheet does not contain any data rows.');
  }
  if (errors.length > 0) {
    throw new ImportValidationError(errors);
  }

  return parsedRows;
}

function sameBookConfiguration(book: ImportBook, row: ParsedRow): boolean {
  return (
    book.description === row.bookDescription &&
    book.priceToman === row.priceToman
  );
}

function buildPlan(rows: ParsedRow[]): ImportPlan {
  const booksByTitle = new Map<string, ImportBook>();
  const chaptersByKey = new Map<string, ImportChapter>();
  const chapterTitlesByBook = new Map<string, Map<string, number>>();
  const questionKeys = new Map<string, number>();
  const errors: string[] = [];

  for (const row of rows) {
    let book = booksByTitle.get(row.bookTitle);
    if (!book) {
      book = {
        title: row.bookTitle,
        description: row.bookDescription,
        priceToman: row.priceToman,
        chapters: [],
      };
      booksByTitle.set(row.bookTitle, book);
    } else if (!sameBookConfiguration(book, row)) {
      errors.push(
        `Row ${row.rowNumber}: book configuration for "${row.bookTitle}" is inconsistent with previous rows.`,
      );
      continue;
    }

    const chapterKey = `${row.bookTitle}\u0000${row.chapterOrder}`;
    let chapter = chaptersByKey.get(chapterKey);
    if (!chapter) {
      chapter = {
        title: row.chapterTitle,
        order: row.chapterOrder,
        isFree: row.isFree,
        questions: [],
      };
      chaptersByKey.set(chapterKey, chapter);
      book.chapters.push(chapter);

      const titles =
        chapterTitlesByBook.get(row.bookTitle) ?? new Map<string, number>();
      const previousOrder = titles.get(row.chapterTitle);
      if (previousOrder !== undefined && previousOrder !== row.chapterOrder) {
        errors.push(
          `Row ${row.rowNumber}: chapter "${row.chapterTitle}" is already assigned to order ${previousOrder}.`,
        );
      }
      titles.set(row.chapterTitle, row.chapterOrder);
      chapterTitlesByBook.set(row.bookTitle, titles);
    } else if (
      chapter.title !== row.chapterTitle ||
      chapter.isFree !== row.isFree
    ) {
      errors.push(
        `Row ${row.rowNumber}: chapter order ${row.chapterOrder} in "${row.bookTitle}" has inconsistent title or isFree values.`,
      );
      continue;
    }

    const questionKey = `${chapterKey}\u0000${row.question.text}`;
    const previousRow = questionKeys.get(questionKey);
    if (previousRow !== undefined) {
      errors.push(
        `Row ${row.rowNumber}: duplicate question in the same chapter; first seen on row ${previousRow}.`,
      );
      continue;
    }
    questionKeys.set(questionKey, row.rowNumber);
    chapter.questions.push(row.question);
  }

  if (errors.length > 0) {
    throw new ImportValidationError(errors);
  }

  const books = [...booksByTitle.values()];
  for (const book of books) {
    book.chapters.sort((left, right) => left.order - right.order);
  }

  return {
    books,
    rowCount: rows.length,
    chapterCount: chaptersByKey.size,
    questionCount: rows.length,
    imageCount: rows.filter((row) => row.question.imageFile !== null).length,
  };
}

export function parseImportSheet(rows: SheetData): ImportPlan {
  if (rows.length > 10_001) {
    throw new ImportValidationError([
      'The import sheet cannot contain more than 10,000 data rows.',
    ]);
  }
  validateHeaders(rows);
  return buildPlan(parseRows(rows));
}

export async function parseExcelImport(
  filePath: string,
  sheetName = IMPORT_SHEET_NAME,
): Promise<ImportPlan> {
  let rows: SheetData;
  try {
    rows = await readSheet(filePath, sheetName);
  } catch (error) {
    if (error instanceof SheetNotFoundError) {
      throw new ImportValidationError([
        `Sheet "${sheetName}" was not found in the workbook.`,
      ]);
    }
    throw error;
  }

  return parseImportSheet(rows);
}
