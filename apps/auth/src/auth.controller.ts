import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import {
  AUTH_CHANGE_PASSWORD_METHOD,
  AUTH_GET_USER_INFO_METHOD,
  AUTH_LOGIN_METHOD,
  AUTH_REGISTER_METHOD,
  AUTH_SERVICE_PING_METHOD,
  AUTH_UPDATE_ACCOUNT_METHOD,
  AUTH_VALIDATE_CONSUMER_METHOD,
  AUTH_VALIDATE_TOKEN_METHOD,
  RmqService,
} from '@app/common';
import {
  AUTHChangePasswordDto,
  AUTHLoginDto,
  AUTHRegisterDto,
  AUTHUpdateAccountDto,
} from '@app/common/schema/auth';
import { User } from 'generated/prisma/client';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rmqService: RmqService,
  ) {}

  @MessagePattern({ cmd: AUTH_SERVICE_PING_METHOD })
  handlePing(@Ctx() context: RmqContext): string {
    try {
      const response = this.authService.ping();
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: AUTH_VALIDATE_CONSUMER_METHOD })
  async handleValidateConsumer(
    @Payload()
    data: AUTHLoginDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.authService.validateUser(data);
      this.rmqService.ack(context);
      return response;
    } catch (error: any) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: AUTH_REGISTER_METHOD })
  async handleRegister(
    @Payload()
    data: AUTHRegisterDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.authService.register(data);
      this.rmqService.ack(context);
      return response;
    } catch (error: any) {
      this.rmqService.ack(context);

      const statusCode = error?.getStatus
        ? error.getStatus()
        : error?.status || 500;

      const errorResponse = error?.response;
      const errors =
        typeof errorResponse === 'object' ? errorResponse.errors : undefined;

      throw new RpcException({
        statusCode,
        message: error?.message || 'Registration failed',
        ...(errors && { errors }),
      });
    }
  }

  @MessagePattern({ cmd: AUTH_LOGIN_METHOD })
  async handleLogin(
    @Payload() user: Omit<User, 'password'>,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.authService.login(user);
      this.rmqService.ack(context);
      return response;
    } catch (error: unknown) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: AUTH_CHANGE_PASSWORD_METHOD })
  async handleChangePassword(
    @Payload()
    data: AUTHChangePasswordDto & { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.authService.changePassword(
        data.userId,
        data.oldPassword,
        data.newPassword,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error: any) {
      this.rmqService.ack(context);

      const statusCode = error?.getStatus
        ? error.getStatus()
        : error?.status || 500;

      const errorResponse =
        typeof error?.response === 'object' ? error.response : {};
      const errors = errorResponse.errors;

      throw new RpcException({
        statusCode,
        message: error?.message || 'Password change failed',
        ...(errors && { errors }),
      });
    }
  }

  @MessagePattern({ cmd: AUTH_GET_USER_INFO_METHOD })
  async handleGetUserInfo(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.authService.getUserInfo(data.userId, false);
      this.rmqService.ack(context);
      return response;
    } catch (error: any) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: AUTH_UPDATE_ACCOUNT_METHOD })
  async handleUpdateAccount(
    @Payload()
    data: AUTHUpdateAccountDto & { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.authService.updateAccount(data.userId, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      });
      this.rmqService.ack(context);
      return response;
    } catch (error: any) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: AUTH_VALIDATE_TOKEN_METHOD })
  async handleValidateToken(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.authService.getUserInfo(data.userId, true);
      this.rmqService.ack(context);
      return response;
    } catch (error: any) {
      this.rmqService.ack(context);
      throw error;
    }
  }
}
