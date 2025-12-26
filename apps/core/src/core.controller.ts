import { Controller, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, RmqContext } from '@nestjs/microservices';
import { CORE_SERVICE_PING_METHOD, RmqService } from '@app/common';
import { CoreService } from './core.service';

@Controller()
export class CoreController {
  private readonly logger = new Logger(CoreController.name);

  constructor(
    private readonly coreService: CoreService,
    private readonly rmqService: RmqService,
  ) {}

  @MessagePattern({ cmd: CORE_SERVICE_PING_METHOD })
  handlePing(@Ctx() context: RmqContext): string {
    try {
      this.logger.debug('Received ping from gateway');
      const response = this.coreService.ping();
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.logger.error('Failed to handle ping', (error as Error)?.stack);
      this.rmqService.nack(context);
      throw error;
    }
  }
}
