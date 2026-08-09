import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { IRANIAN_PHONE_PATTERN } from './request-otp-dto';

export class VerifyOtpDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(IRANIAN_PHONE_PATTERN, {
    message: 'phone must be a valid Iranian mobile number',
  })
  phone: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;

  @IsString()
  @IsOptional()
  name?: string;
}
