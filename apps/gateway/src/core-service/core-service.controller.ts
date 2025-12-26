import {
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';
import { CORE_SERVICE_PING_METHOD } from '@app/common';

@Controller('core-service')
export class CoreServiceController implements OnModuleInit {
  private readonly logger = new Logger(CoreServiceController.name);
  private readonly pingTimeoutMs = Number(process.env.PING_TIMEOUT_MS ?? 3000);

  constructor(
    @Inject('CORE_SERVICE')
    private readonly coreServiceClient: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.coreServiceClient.connect();

    const client = (this.coreServiceClient as any).client;

    client.on('connect', () => {
      console.log('Core Service RMQ connected');
    });

    client.on('disconnect', (err) => {
      console.error('Core Service RMQ disconnected', err);
    });
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping core service' })
  @ApiResponse({ status: 200 })
  async pingCoreService() {
    try {
      const response$ = this.coreServiceClient.send<string>(
        { cmd: CORE_SERVICE_PING_METHOD },
        {},
      );

      const result = await firstValueFrom(
        response$.pipe(timeout(this.pingTimeoutMs)),
      );

      console.log('Core service ping response:', result);

      return {
        data: result,
        message: 'Core service ping successful',
      };
    } catch (error) {
      this.logger.error('Core service ping failed', (error as Error)?.stack);
      throw new InternalServerErrorException('Core service unavailable');
    }
  }
}
