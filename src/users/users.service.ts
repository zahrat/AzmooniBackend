import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDTO } from './create-user-dto';
import { AuthResponse, UserResponse } from './user';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { SignInDTO } from './sign-in-dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

  async signIn(payload: SignInDTO): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      accessToken: await this.signToken(user.id, user.email),
    };
  }

  private async signToken(userId: number, email: string): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
    });
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
