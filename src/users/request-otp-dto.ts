import { IsNotEmpty, IsString, Matches } from 'class-validator';

export const IRANIAN_PHONE_PATTERN = /^(?:\+98|0098|98|0)?9\d{9}$/;

export class RequestOtpDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(IRANIAN_PHONE_PATTERN, {
    message: 'phone must be a valid Iranian mobile number',
  })
  phone: string;
}
