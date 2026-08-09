import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChangePasswordDTO } from './change-password-dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenDTO } from './refresh-token-dto';
import { RequestOtpDTO } from './request-otp-dto';
import { SignInDTO } from './sign-in-dto';
import type { AuthResponse, JwtUser } from './user';
import { UsersService } from './users.service';
import { VerifyOtpDTO } from './verify-otp-dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/otp/request')
  @HttpCode(HttpStatus.ACCEPTED)
  requestOtp(@Body() payload: RequestOtpDTO) {
    return this.usersService.requestOtp(payload);
  }

  @Post('/otp/verify')
  verifyOtp(@Body() payload: VerifyOtpDTO): Promise<AuthResponse> {
    return this.usersService.verifyOtp(payload);
  }

  @Post('/signin')
  signIn(@Body() payload: SignInDTO): Promise<AuthResponse> {
    return this.usersService.signIn(payload);
  }

  @Post('/refresh')
  refresh(@Body() payload: RefreshTokenDTO): Promise<AuthResponse> {
    return this.usersService.refresh(payload.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  me(@Req() request: RequestWithUser): JwtUser {
    return request.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @Req() request: RequestWithUser,
    @Body() payload: ChangePasswordDTO,
  ): Promise<void> {
    return this.usersService.changePassword(request.user.id, payload);
  }
}
