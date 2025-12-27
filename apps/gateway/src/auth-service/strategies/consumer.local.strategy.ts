import {
  AUTH_VALIDATE_CONSUMER_METHOD,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PassportStrategy } from '@nestjs/passport';
import { User } from 'generated/prisma/client';
import { Strategy } from 'passport-local';

@Injectable()
export class ConsumerLocalStrategy extends PassportStrategy(
  Strategy,
  'consumer-local',
) {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    super({
      usernameField: 'email',
    });
  }

  async validate(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.rpcClient.send<Omit<User, 'password'>>(
        this.authClient,
        { cmd: AUTH_VALIDATE_CONSUMER_METHOD },
        { email, password },
      );

      if (!user) {
        throw new UnauthorizedException('auth.invalid_email_or_password');
      }

      return user;
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_VALIDATE_CONSUMER_METHOD);
    }
  }
}
