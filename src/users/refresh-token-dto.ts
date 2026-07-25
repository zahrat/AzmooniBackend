import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshTokenDTO {
  @IsJWT()
  @IsNotEmpty()
  refreshToken: string;
}
