import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { ClientsModule } from '@nestjs/microservices';
import {
  RmqModule,
  RmqService,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@app/prisma';
import { ConsumerLocalStrategy } from './strategies/consumer.local.strategy';
import { ConsumerJwtStrategy } from './strategies/consumer.jwt.strategy';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    RmqModule,
    PrismaModule,
    PassportModule,
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
  providers: [
    ConsumerLocalStrategy,
    ConsumerJwtStrategy,
    ErrorHandlerService,
    RpcClientService,
    JwtService,
  ],
})
export class AuthServiceModule {}
