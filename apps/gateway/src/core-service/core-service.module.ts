import { Module } from '@nestjs/common';
import { CoreServiceController } from './core-service.controller';
import { ClientsModule } from '@nestjs/microservices';
import {
  RmqModule,
  RmqService,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import { ConsumerMembershipController } from './consumer-membership.controller';
import { AdminMembershipController } from './admin-membership.controller';
import { ConsumerWalletController } from './consumer-wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { RedisCacheService } from '../shared/redis-cache.service';

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
  controllers: [
    CoreServiceController,
    ConsumerMembershipController,
    AdminMembershipController,
    ConsumerWalletController,
    AdminWalletController,
  ],
  providers: [ErrorHandlerService, RpcClientService, RedisCacheService],
})
export class CoreServiceModule {}
