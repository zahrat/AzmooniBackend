import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsStrongPassword()
  @IsNotEmpty()
  newPassword: string;
}
