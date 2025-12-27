import {
  Controller,
  Inject,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  AUTH_ADMIN_CHANGE_PASSWORD_METHOD,
  AUTH_ADMIN_GET_USER_INFO_METHOD,
  AUTH_ADMIN_LOGIN_METHOD,
  AUTH_ADMIN_UPDATE_ACCOUNT_METHOD,
  CurrentUser,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import {
  AUTHChangePasswordDto,
  AUTHLoginDto,
  AUTHUpdateAccountDto,
} from '@app/common/schema/auth';
import { User } from 'generated/prisma/client';
import { AdminLocalAuthGuard } from './guards/admin-local-auth.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';

@ApiTags('Auth - Admin')
@Controller('auth-admin')
export class AdminAuthServiceController {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login admin' })
  @UseGuards(AdminLocalAuthGuard)
  @ApiBody({ type: AUTHLoginDto })
  async login(@CurrentUser() user: Omit<any, 'password'>) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_ADMIN_LOGIN_METHOD },
        user,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_ADMIN_LOGIN_METHOD);
    }
  }

  @Get('whoami')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Get admin info' })
  async getUserInfo(@CurrentUser() user: Omit<User, 'password'>) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_ADMIN_GET_USER_INFO_METHOD },
        { userId: user.id },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_ADMIN_GET_USER_INFO_METHOD);
    }
  }

  @Patch('updated-account')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Update admin account' })
  async updateAccount(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() dto: AUTHUpdateAccountDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_ADMIN_UPDATE_ACCOUNT_METHOD },
        { userId: user.id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_ADMIN_UPDATE_ACCOUNT_METHOD);
    }
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Change admin password' })
  async changePassword(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() dto: AUTHChangePasswordDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_ADMIN_CHANGE_PASSWORD_METHOD },
        {
          userId: user.id,
          oldPassword: dto.oldPassword,
          newPassword: dto.newPassword,
        },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        AUTH_ADMIN_CHANGE_PASSWORD_METHOD,
      );
    }
  }
}
