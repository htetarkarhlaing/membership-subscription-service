import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { PasswordUtil } from '@app/common';
import { JwtService } from '@nestjs/jwt';
import {
  AUTHLoginDto,
  AUTHRegisterDto,
  AUTHUpdateAccountDto,
} from '@app/common/schema/auth';
import { User } from 'generated/prisma/client';
import { RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  ping(): string {
    return 'Auth Service Running!';
  }

  async validateUser(
    data: AUTHLoginDto,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'auth.user_not_found',
      });
    }

    if (user.UserStatus === 'SUSPENDED') {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'account_suspended',
      });
    }

    if (user.UserStatus === 'INACTIVE') {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'account_inactive',
      });
    }

    if (user.UserRole !== 'CONSUMER') {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'access_denied',
      });
    }

    const isPasswordValid = await PasswordUtil.verify(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;

    return result;
  }

  async generateToken(user: {
    id: string;
    email: string;
    UserRole: string;
  }): Promise<string> {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.UserRole,
    };
    return await this.jwtService.signAsync(payload, {
      secret: this.configService.get('CONSUMER_ACCESS_JWT_SECRET'),
      expiresIn: this.configService.get('ACCESS_JWT_EXPIRATION'),
    });
  }

  async register(data: AUTHRegisterDto) {
    const validation = PasswordUtil.validateStrength(data.password);
    if (!validation.isValid) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.password_strength_invalid',
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.email_already_exists',
      });
    }

    const hashedPassword = await PasswordUtil.hash(data.password);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        UserRole: 'CONSUMER',
        UserStatus: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        UserRole: true,
        UserStatus: true,
        createdAt: true,
      },
    });

    const accessToken = await this.generateToken(user);

    return {
      success: true,
      message: 'auth.register_successful',
      data: {
        user,
        accessToken,
      },
    };
  }

  async login(user: Omit<User, 'password'>) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'auth.user_not_found',
      });
    }

    const userData = {
      id: existingUser.id,
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      UserRole: existingUser.UserRole,
      UserStatus: existingUser.UserStatus,
    };

    const accessToken = await this.generateToken(userData);

    return {
      success: true,
      message: 'auth.login_successful',
      data: {
        accessToken,
      },
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'auth.user_not_found',
      });
    }

    const isOldPasswordValid = await PasswordUtil.verify(
      oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'auth.current_password_incorrect',
      });
    }

    const validation = PasswordUtil.validateStrength(newPassword);
    if (!validation.isValid) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'auth.password_strength_invalid',
      });
    }

    const hashedPassword = await PasswordUtil.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: 'auth.password_changed_successfully',
      data: null,
    };
  }

  async getUserInfo(userId: string, isValidate: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        UserRole: true,
        UserStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'auth.user_not_found',
      });
    }

    if (isValidate) {
      return user;
    }

    return {
      success: true,
      message: 'auth.user_info_retrieved',
      data: { user },
    };
  }

  async updateAccount(userId: string, data: AUTHUpdateAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'auth.user_not_found',
      });
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'auth.email_already_exists',
        });
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName ?? user.firstName,
        lastName: data.lastName ?? user.lastName,
        email: data.email ?? user.email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        UserRole: true,
        UserStatus: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'auth.account_updated_successfully',
      data: { user: updatedUser },
    };
  }
}
