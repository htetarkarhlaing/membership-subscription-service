import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RmqModule } from '@app/common';
import { PrismaModule } from '@app/prisma';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), RmqModule, PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, JwtService],
})
export class AuthModule {}
