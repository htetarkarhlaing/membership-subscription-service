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
  AUTH_CHANGE_PASSWORD_METHOD,
  AUTH_GET_USER_INFO_METHOD,
  AUTH_LOGIN_METHOD,
  AUTH_REGISTER_METHOD,
  AUTH_SERVICE_PING_METHOD,
  AUTH_UPDATE_ACCOUNT_METHOD,
  CurrentUser,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import {
  AUTHChangePasswordDto,
  AUTHLoginDto,
  AUTHRegisterDto,
  AUTHUpdateAccountDto,
} from '@app/common/schema/auth';
import { ConsumerLocalAuthGuard } from './guards/consumer-local-auth.guard';
import { User } from 'generated/prisma/client';
import { ConsumerJwtAuthGuard } from './guards/consumer-jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthServiceController {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  @Get('ping')
  @ApiOperation({ summary: 'Ping auth microservice' })
  async ping(): Promise<string> {
    try {
      return await this.rpcClient.send<string>(
        this.authClient,
        { cmd: AUTH_SERVICE_PING_METHOD },
        {},
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_SERVICE_PING_METHOD);
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: AUTHRegisterDto) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_REGISTER_METHOD },
        dto,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, 'register');
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @UseGuards(ConsumerLocalAuthGuard)
  @ApiBody({ type: AUTHLoginDto })
  async login(@CurrentUser() user: Omit<any, 'password'>) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_LOGIN_METHOD },
        user,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_LOGIN_METHOD);
    }
  }

  @Get('users/whoami')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Get user info' })
  async getUserInfo(@CurrentUser() user: Omit<User, 'password'>) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_GET_USER_INFO_METHOD },
        { userId: user.id },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_GET_USER_INFO_METHOD);
    }
  }

  @Patch('users/updated-account')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Update user account' })
  async updateAccount(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() dto: AUTHUpdateAccountDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_UPDATE_ACCOUNT_METHOD },
        { userId: user.id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_UPDATE_ACCOUNT_METHOD);
    }
  }

  @Patch('users/change-password')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() dto: AUTHChangePasswordDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.authClient,
        { cmd: AUTH_CHANGE_PASSWORD_METHOD },
        {
          userId: user.id,
          oldPassword: dto.oldPassword,
          newPassword: dto.newPassword,
        },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_CHANGE_PASSWORD_METHOD);
    }
  }
}
