import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateChapterDTO {
  @IsInt()
  bookId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;
}
