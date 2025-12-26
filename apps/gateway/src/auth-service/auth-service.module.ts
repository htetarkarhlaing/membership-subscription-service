import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { ClientsModule } from '@nestjs/microservices';
import { RmqModule, RmqService } from '@app/common';

@Module({
  imports: [
    RmqModule,
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [RmqModule],
        useFactory: (rmqService: RmqService) =>
          rmqService.getClientOptions(
            process.env.RABBIT_MQ_AUTH_QUEUE ?? 'auth.queue',
          ),
        inject: [RmqService],
      },
    ]),
  ],
  controllers: [AuthServiceController],
  providers: [],
})
export class AuthServiceModule {}
