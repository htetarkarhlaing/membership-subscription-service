import {
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE_PING_METHOD } from '@app/common';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('auth-service')
export class AuthServiceController {
  private readonly logger = new Logger(AuthServiceController.name);
  private readonly pingTimeoutMs = Number(process.env.PING_TIMEOUT_MS ?? 3000);
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}

  @Get('ping')
  @ApiOperation({ summary: 'Ping auth service' })
  @ApiResponse({ status: 200 })
  async pingAuthService() {
    try {
      const response$ = this.authService.send<string>(
        { cmd: AUTH_SERVICE_PING_METHOD },
        {},
      );

      const result = await firstValueFrom(
        response$.pipe(timeout(this.pingTimeoutMs)),
      );

      console.log('Auth service ping response:', result);

      return {
        data: result,
        message: 'Auth service ping successful',
      };
    } catch (error) {
      this.logger.error('Auth service ping failed', (error as Error)?.stack);
      throw new InternalServerErrorException('Auth service unavailable');
    }
  }
}
