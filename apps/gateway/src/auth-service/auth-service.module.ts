import { Module } from '@nestjs/common';
import { ConsumerAuthServiceController } from './consumer.auth-service.controller';
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
import { AdminLocalStrategy } from './strategies/admin.local.strategy';
import { AdminJwtStrategy } from './strategies/admin.jwt.strategy';
import { AdminAuthServiceController } from './admin.auth-service.controller';
import { ConsumerLocalAuthGuard } from './guards/consumer-local-auth.guard';
import { ConsumerJwtAuthGuard } from './guards/consumer-jwt-auth.guard';
import { AdminLocalAuthGuard } from './guards/admin-local-auth.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';

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
  controllers: [ConsumerAuthServiceController, AdminAuthServiceController],
  providers: [
    ConsumerLocalStrategy,
    ConsumerJwtStrategy,
    AdminLocalStrategy,
    AdminJwtStrategy,
    ConsumerLocalAuthGuard,
    ConsumerJwtAuthGuard,
    AdminLocalAuthGuard,
    AdminJwtAuthGuard,
    ErrorHandlerService,
    RpcClientService,
    JwtService,
  ],
})
export class AuthServiceModule {}
