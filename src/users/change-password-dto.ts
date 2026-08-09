import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class ChangePasswordDTO {
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsStrongPassword()
  @IsNotEmpty()
  newPassword: string;
}
