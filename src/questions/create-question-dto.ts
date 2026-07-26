import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

const toNumber = ({ value }: TransformFnParams): unknown => {
  const input: unknown = value;
  return typeof input === 'string' && input.trim() !== ''
    ? Number(input)
    : input;
};

export class CreateQuestionDTO {
  @Transform(toNumber)
  @IsInt()
  chapterId: number;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsString()
  optionA: string;

  @IsString()
  @IsNotEmpty()
  optionB: string;

  @IsString()
  @IsNotEmpty()
  optionC: string;

  @IsString()
  @IsNotEmpty()
  optionD: string;

  @IsIn(['A', 'B', 'C', 'D'])
  correctOption: string;
}
