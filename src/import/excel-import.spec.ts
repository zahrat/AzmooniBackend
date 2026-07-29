import {
  IMPORT_HEADERS,
  ImportValidationError,
  parseImportSheet,
} from './excel-import';

const validRow = [
  'ریاضی دهم',
  'توضیح کتاب',
  'FALSE',
  null,
  'فصل اول',
  1,
  'TRUE',
  'حاصل دو به علاوه دو؟',
  'صفحه ۱۲',
  '۳',
  '۴',
  '۵',
  '۶',
  'B',
  null,
  null,
];

describe('parseImportSheet', () => {
  it('groups valid rows into books and chapters', () => {
    const plan = parseImportSheet([
      [...IMPORT_HEADERS],
      validRow,
      [
        ...validRow.slice(0, 4),
        'فصل دوم',
        2,
        'FALSE',
        'سؤال فصل دوم',
        null,
        'الف',
        'ب',
        'ج',
        'د',
        'A',
        null,
        null,
      ],
    ]);

    expect(plan).toMatchObject({
      rowCount: 2,
      chapterCount: 2,
      questionCount: 2,
      imageCount: 0,
    });
    expect(plan.books).toHaveLength(1);
    expect(plan.books[0].chapters).toHaveLength(2);
    expect(plan.books[0].chapters[0].questions[0].correctOption).toBe('B');
  });

  it('accepts Persian digits for integer fields', () => {
    const row = [...validRow];
    row[5] = '۲';

    const plan = parseImportSheet([[...IMPORT_HEADERS], row]);

    expect(plan.books[0].chapters[0].order).toBe(2);
  });

  it('rejects duplicate questions in the same chapter', () => {
    expect(() =>
      parseImportSheet([[...IMPORT_HEADERS], validRow, validRow]),
    ).toThrow(
      expect.objectContaining({
        name: 'ImportValidationError',
        errors: [
          expect.stringContaining('duplicate question in the same chapter'),
        ],
      }) as ImportValidationError,
    );
  });

  it('rejects inconsistent payment configuration', () => {
    const invalidRow = [...validRow];
    invalidRow[2] = 'TRUE';
    invalidRow[3] = null;

    expect(() => parseImportSheet([[...IMPORT_HEADERS], invalidRow])).toThrow(
      'a paid book must have a positive priceToman',
    );
  });

  it('rejects renamed headers', () => {
    const headers = [...IMPORT_HEADERS];
    headers[0] = 'عنوان کتاب';

    expect(() => parseImportSheet([headers, validRow])).toThrow(
      'expected header "bookTitle"',
    );
  });
});
