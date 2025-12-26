import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { CoreServiceModule } from './core-service/core-service.module';
import { AuthServiceModule } from './auth-service/auth-service.module';

@Module({
  imports: [CoreServiceModule, AuthServiceModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
