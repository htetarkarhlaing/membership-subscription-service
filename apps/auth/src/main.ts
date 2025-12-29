import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions } from '@nestjs/microservices';
import { buildRmqServerOptions } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.connectMicroservice<MicroserviceOptions>(
    buildRmqServerOptions(process.env.RABBIT_MQ_AUTH_QUEUE ?? 'auth.queue'),
  );

  await app.startAllMicroservices();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Auth service running with RMQ + HTTP on port ${port}`);
}

void bootstrap();
