import { IsIn, IsInt } from 'class-validator';

export class CreateAnswerDTO {
  @IsInt()
  questionId: number;

  @IsIn(['A', 'B', 'C', 'D'])
  selectedOption: string;
}
