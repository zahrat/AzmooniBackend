import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateQuestionDTO {
  @IsInt()
  bookId: number;

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
