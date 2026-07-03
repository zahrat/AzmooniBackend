import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDTO } from './create-user-dto';
import { UsersService } from './users.service';
import { UserResponse } from './user';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/signup')
  create(@Body() createUserDto: CreateUserDTO): Promise<UserResponse> {
    return this.usersService.signup(createUserDto);
  }
}
