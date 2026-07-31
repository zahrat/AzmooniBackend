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
import { CreateUserDTO } from './create-user-dto';
import { UsersService } from './users.service';
import type { AuthResponse, JwtUser, UserResponse } from './user';
import { SignInDTO } from './sign-in-dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenDTO } from './refresh-token-dto';
import { ChangePasswordDTO } from './change-password-dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/signup')
  create(@Body() createUserDto: CreateUserDTO): Promise<UserResponse> {
    return this.usersService.signup(createUserDto);
  }

  @Post('/signin')
  signIn(@Body() signInDto: SignInDTO): Promise<AuthResponse> {
    return this.usersService.signIn(signInDto);
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
