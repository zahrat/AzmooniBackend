import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}
