import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateUserDTO } from './create-user-dto';
import { UsersService } from './users.service';
import type { AuthResponse, JwtUser, UserResponse } from './user';
import { SignInDTO } from './sign-in-dto';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  me(@Req() request: RequestWithUser): JwtUser {
    return request.user;
  }
}
