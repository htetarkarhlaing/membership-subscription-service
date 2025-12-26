import { Controller, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Ctx, MessagePattern, RmqContext } from '@nestjs/microservices';
import { AUTH_SERVICE_PING_METHOD, RmqService } from '@app/common';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly rmqService: RmqService,
  ) {}

  @MessagePattern({ cmd: AUTH_SERVICE_PING_METHOD })
  handlePing(@Ctx() context: RmqContext): string {
    try {
      this.logger.debug('Received ping from gateway');
      const response = this.authService.ping();
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.logger.error('Failed to handle auth ping', (error as Error)?.stack);
      this.rmqService.nack(context);
      throw error;
    }
  }
}
