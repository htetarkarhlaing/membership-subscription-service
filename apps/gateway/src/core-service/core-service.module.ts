import { Module } from '@nestjs/common';
import { CoreServiceController } from './core-service.controller';
import { ClientsModule } from '@nestjs/microservices';
import { RmqModule, RmqService } from '@app/common';

@Module({
  imports: [
    RmqModule,
    ClientsModule.registerAsync([
      {
        name: 'CORE_SERVICE',
        imports: [RmqModule],
        useFactory: (rmqService: RmqService) =>
          rmqService.getClientOptions(
            process.env.RABBIT_MQ_CORE_QUEUE ?? 'core.queue',
          ),
        inject: [RmqService],
      },
    ]),
  ],
  controllers: [CoreServiceController],
  providers: [],
})
export class CoreServiceModule {}
