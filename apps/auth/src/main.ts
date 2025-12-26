import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions } from '@nestjs/microservices';
import { buildRmqServerOptions } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    buildRmqServerOptions(process.env.RABBIT_MQ_AUTH_QUEUE ?? 'auth.queue'),
  );

  await app.listen();
}
void bootstrap();
