import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDTO } from './create-user-dto';
import { UserResponse } from './user';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async encryptPassword(plainText: string, saltRounds: number): Promise<string> {
    return await bcrypt.hash(plainText, saltRounds);
  }

  async signup(payload: CreateUserDTO): Promise<UserResponse> {
    const password = await this.encryptPassword(payload.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          password,
        },
        select: {
          id: true,
          email: true,
        },
      });

      return user;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
