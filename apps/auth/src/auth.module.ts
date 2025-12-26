import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RmqModule } from '@app/common';

@Module({
  imports: [RmqModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
