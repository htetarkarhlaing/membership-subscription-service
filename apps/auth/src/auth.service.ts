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

type UserRoleType = 'CONSUMER' | 'ADMIN';
type MessagePrefix = 'auth' | 'auth_admin';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getPrefix(role: UserRoleType): MessagePrefix {
    return role === 'ADMIN' ? 'auth_admin' : 'auth';
  }

  private getMessage(prefix: MessagePrefix, key: string): string {
    return `${prefix}.${key}`;
  }

  private assertStatus(user: User, prefix: MessagePrefix) {
    if (user.UserStatus === 'SUSPENDED') {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: this.getMessage(prefix, 'account_suspended'),
      });
    }

    if (user.UserStatus === 'INACTIVE') {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: this.getMessage(prefix, 'account_inactive'),
      });
    }
  }

  private assertRole(
    user: { UserRole: string },
    role: UserRoleType,
    prefix: MessagePrefix,
  ) {
    if (user.UserRole !== role) {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: this.getMessage(prefix, 'access_denied'),
      });
    }
  }

  private async validateByRole(
    data: AUTHLoginDto,
    role: UserRoleType,
  ): Promise<Omit<User, 'password'> | null> {
    const prefix = this.getPrefix(role);
    const user = await this.prisma.user.findFirst({
      where: { email: data.email, UserRole: role },
    });

    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: this.getMessage(prefix, 'user_not_found'),
      });
    }

    this.assertStatus(user, prefix);
    this.assertRole(user, role, prefix);

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

  private async generateTokenForRole(
    user: { id: string; email: string; UserRole: string },
    role: UserRoleType,
  ): Promise<string> {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.UserRole,
    };

    const secretKeyName =
      role === 'ADMIN'
        ? 'ADMIN_ACCESS_JWT_SECRET'
        : 'CONSUMER_ACCESS_JWT_SECRET';

    return await this.jwtService.signAsync(payload, {
      secret: this.configService.get(secretKeyName) || 'secret',
      expiresIn: this.configService.get('ACCESS_JWT_EXPIRATION'),
    });
  }

  ping(): string {
    return 'Auth Service Running!';
  }

  async validateUser(
    data: AUTHLoginDto,
  ): Promise<Omit<User, 'password'> | null> {
    return this.validateByRole(data, 'CONSUMER');
  }

  async validateAdmin(
    data: AUTHLoginDto,
  ): Promise<Omit<User, 'password'> | null> {
    return this.validateByRole(data, 'ADMIN');
  }

  async register(data: AUTHRegisterDto) {
    const prefix: MessagePrefix = 'auth';
    const validation = PasswordUtil.validateStrength(data.password);
    if (!validation.isValid) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: this.getMessage(prefix, 'password_strength_invalid'),
      });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email, UserRole: 'CONSUMER' },
    });

    if (existingUser) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: this.getMessage(prefix, 'email_already_exists'),
      });
    }

    const hashedPassword = await PasswordUtil.hash(data.password);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
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

      await tx.wallet.create({
        data: {
          userId: createdUser.id,
        },
      });

      return { user: createdUser };
    });

    const accessToken = await this.generateTokenForRole(user, 'CONSUMER');

    return {
      success: true,
      message: this.getMessage(prefix, 'register_successful'),
      data: {
        user,
        accessToken,
      },
    };
  }

  private async loginByRole(user: Omit<User, 'password'>, role: UserRoleType) {
    const prefix = this.getPrefix(role);
    const existingUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: this.getMessage(prefix, 'user_not_found'),
      });
    }

    this.assertStatus(existingUser, prefix);
    this.assertRole(existingUser, role, prefix);

    const userData = {
      id: existingUser.id,
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      UserRole: existingUser.UserRole,
      UserStatus: existingUser.UserStatus,
    };

    const accessToken = await this.generateTokenForRole(userData, role);

    return {
      success: true,
      message: this.getMessage(prefix, 'login_successful'),
      data: {
        accessToken,
      },
    };
  }

  async login(user: Omit<User, 'password'>) {
    return this.loginByRole(user, 'CONSUMER');
  }

  async loginAdmin(user: Omit<User, 'password'>) {
    return this.loginByRole(user, 'ADMIN');
  }

  private async changePasswordByRole(
    userId: string,
    oldPassword: string,
    newPassword: string,
    role: UserRoleType,
  ) {
    const prefix = this.getPrefix(role);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: this.getMessage(prefix, 'user_not_found'),
      });
    }

    this.assertRole(user, role, prefix);

    const isOldPasswordValid = await PasswordUtil.verify(
      oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: this.getMessage(prefix, 'current_password_incorrect'),
      });
    }

    const validation = PasswordUtil.validateStrength(newPassword);
    if (!validation.isValid) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: this.getMessage(prefix, 'password_strength_invalid'),
      });
    }

    const hashedPassword = await PasswordUtil.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: this.getMessage(prefix, 'password_changed_successfully'),
      data: null,
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    return this.changePasswordByRole(
      userId,
      oldPassword,
      newPassword,
      'CONSUMER',
    );
  }

  async changeAdminPassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    return this.changePasswordByRole(userId, oldPassword, newPassword, 'ADMIN');
  }

  private async getUserInfoByRole(
    userId: string,
    isValidate: boolean,
    role: UserRoleType,
  ) {
    const prefix = this.getPrefix(role);
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
        message: this.getMessage(prefix, 'user_not_found'),
      });
    }

    this.assertRole(user, role, prefix);

    if (isValidate) {
      return user;
    }

    return {
      success: true,
      message: this.getMessage(prefix, 'user_info_retrieved'),
      data: { user },
    };
  }

  async getUserInfo(userId: string, isValidate: boolean) {
    return this.getUserInfoByRole(userId, isValidate, 'CONSUMER');
  }

  async getAdminUserInfo(userId: string, isValidate: boolean) {
    return this.getUserInfoByRole(userId, isValidate, 'ADMIN');
  }

  private async updateAccountByRole(
    userId: string,
    data: AUTHUpdateAccountDto,
    role: UserRoleType,
  ) {
    const prefix = this.getPrefix(role);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: this.getMessage(prefix, 'user_not_found'),
      });
    }

    this.assertRole(user, role, prefix);

    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          UserRole: role,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: this.getMessage(prefix, 'email_already_exists'),
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
      message: this.getMessage(prefix, 'account_updated_successfully'),
      data: { user: updatedUser },
    };
  }

  async updateAccount(userId: string, data: AUTHUpdateAccountDto) {
    return this.updateAccountByRole(userId, data, 'CONSUMER');
  }

  async updateAdminAccount(userId: string, data: AUTHUpdateAccountDto) {
    return this.updateAccountByRole(userId, data, 'ADMIN');
  }
}
