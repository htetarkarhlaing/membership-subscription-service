import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClientProxy } from '@nestjs/microservices';
import {
  AUTH_VALIDATE_ADMIN_TOKEN_METHOD,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import { User } from 'generated/prisma/client';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: (process.env.ADMIN_ACCESS_JWT_SECRET as string) || 'secret',
    });
  }

  async validate(payload: { id: string }): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.rpcClient.send<Omit<User, 'password'>>(
        this.authClient,
        { cmd: AUTH_VALIDATE_ADMIN_TOKEN_METHOD },
        { userId: payload.id },
      );

      if (!user) {
        throw new UnauthorizedException('auth_admin.authentication_failed');
      }

      return user;
    } catch (error) {
      this.errorHandler.handleRpcError(error, AUTH_VALIDATE_ADMIN_TOKEN_METHOD);
    }
  }
}
