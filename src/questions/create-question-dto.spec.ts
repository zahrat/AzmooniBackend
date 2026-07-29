import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { CreateQuestionDTO } from './create-question-dto';

describe('CreateQuestionDTO', () => {
  it('converts a multipart chapterId to a number', async () => {
    const pipe = new ValidationPipe({ transform: true });
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateQuestionDTO,
    };

    const result: unknown = await pipe.transform(
      {
        chapterId: '3',
        text: 'Question?',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctOption: 'A',
      },
      metadata,
    );

    expect(result).toEqual(expect.objectContaining({ chapterId: 3 }));
  });

  it('accepts an optional string source', async () => {
    const pipe = new ValidationPipe({ transform: true });
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateQuestionDTO,
    };

    const result: unknown = await pipe.transform(
      {
        chapterId: 3,
        text: 'Question?',
        source: 'Clean Code, Chapter 2',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctOption: 'A',
      },
      metadata,
    );

    expect(result).toEqual(
      expect.objectContaining({ source: 'Clean Code, Chapter 2' }),
    );
  });
});
